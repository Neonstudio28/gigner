import * as THREE from 'three';
import { Rng } from './core/rng';

type Ctx2D = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

function shade(hex: string, l: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, l);
  return '#' + c.getHexString();
}

function grey(v: number): string {
  const n = Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${n},${n},${n})`;
}

function speckle(g: Ctx2D, w: number, h: number, rng: Rng, n: number, amp: number) {
  for (let i = 0; i < n; i++) {
    const v = rng.range(-amp, amp);
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 3), rng.range(1, 3));
  }
}

// ---------------------------------------------------------------- tiling surfaces (512² array layers)

const S = 512;

function brick(brickCol: string, mortar: string, seed: number): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(seed);
  g.fillStyle = mortar;
  g.fillRect(0, 0, S, S);
  const rows = 32;
  const per = 10;
  const rh = S / rows;
  const bw = S / per;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (bw / 2);
    for (let i = -1; i <= per; i++) {
      g.fillStyle = shade(brickCol, rng.range(-0.06, 0.05));
      g.fillRect(i * bw + off + 1, r * rh + 1, bw - 2, rh - 2);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(i * bw + off + 1, r * rh + 1, bw - 2, 2);
    }
  }
  speckle(g, S, S, rng, 2500, 0.08);
  return c;
}

function lapSiding(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const boards = 10;
  const bh = S / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    const grd = g.createLinearGradient(0, y, 0, y + bh);
    grd.addColorStop(0, grey(252));
    grd.addColorStop(0.85, grey(232));
    grd.addColorStop(1, grey(214));
    g.fillStyle = grd;
    g.fillRect(0, y, S, bh);
    g.fillStyle = grey(150);
    g.fillRect(0, y + bh - 3, S, 3);
  }
  return c;
}

function boardBatten(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(7);
  g.fillStyle = grey(228);
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(0,0,0,${rng.range(0.02, 0.06)})`;
    g.fillRect(rng.range(0, S), 0, 1, S);
  }
  const step = S / 8;
  for (let i = 0; i < 8; i++) {
    const x = i * step;
    g.fillStyle = grey(170);
    g.fillRect(x + step - 9, 0, 2, S);
    g.fillStyle = grey(250);
    g.fillRect(x + step - 7, 0, 10, S);
    g.fillStyle = grey(185);
    g.fillRect(x + step + 3, 0, 2, S);
  }
  return c;
}

function roofMetal(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = grey(222);
  g.fillRect(0, 0, S, S);
  const seams = 6;
  const sw = S / seams;
  for (let i = 0; i < seams; i++) {
    const x = i * sw;
    const grd = g.createLinearGradient(x, 0, x + sw, 0);
    grd.addColorStop(0, grey(238));
    grd.addColorStop(0.5, grey(222));
    grd.addColorStop(1, grey(206));
    g.fillStyle = grd;
    g.fillRect(x, 0, sw, S);
    g.fillStyle = grey(255);
    g.fillRect(x, 0, 3, S);
    g.fillStyle = grey(150);
    g.fillRect(x + 3, 0, 3, S);
  }
  return c;
}

function corrugated(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const n = 32;
  for (let i = 0; i < n; i++) {
    const x = (i * S) / n;
    const grd = g.createLinearGradient(x, 0, x + S / n, 0);
    grd.addColorStop(0, grey(176));
    grd.addColorStop(0.5, grey(250));
    grd.addColorStop(1, grey(176));
    g.fillStyle = grd;
    g.fillRect(x, 0, S / n + 1, S);
  }
  const rng = new Rng(41);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(120,70,40,${rng.range(0.03, 0.09)})`;
    g.fillRect(rng.range(0, S), rng.range(0, S), rng.range(4, 30), rng.range(20, 120));
  }
  return c;
}

function shingle(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(11);
  const rows = 8;
  const rh = S / rows;
  const tabs = 6;
  const tw = S / tabs;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (tw / 2);
    for (let i = -1; i <= tabs; i++) {
      g.fillStyle = grey(rng.range(196, 236));
      g.fillRect(i * tw + off, r * rh, tw - 3, rh);
    }
    g.fillStyle = grey(120);
    g.fillRect(0, r * rh + rh - 4, S, 4);
  }
  speckle(g, S, S, rng, 3000, 0.1);
  return c;
}

function cinder(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(19);
  g.fillStyle = grey(196);
  g.fillRect(0, 0, S, S);
  const rows = 12;
  const per = 6;
  const rh = S / rows;
  const bw = S / per;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (bw / 2);
    for (let i = -1; i <= per; i++) {
      g.fillStyle = grey(rng.range(236, 250));
      g.fillRect(i * bw + off + 2, r * rh + 2, bw - 4, rh - 4);
    }
  }
  speckle(g, S, S, rng, 6000, 0.05);
  return c;
}

function stone(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(57);
  g.fillStyle = grey(190);
  g.fillRect(0, 0, S, S);
  const rows = 8;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rng.range(0, 60);
    while (x < S) {
      const bw = rng.range(70, 140);
      g.fillStyle = grey(rng.range(232, 250));
      g.fillRect(x + 2, r * rh + 2, bw - 4, rh - 4);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x + 2, r * rh + 2, bw - 4, 3);
      x += bw;
    }
  }
  speckle(g, S, S, rng, 7000, 0.06);
  return c;
}

function stucco(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(61);
  g.fillStyle = grey(240);
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, rng, 26000, 0.07);
  return c;
}

function concrete(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(23);
  g.fillStyle = grey(238);
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, rng, 9000, 0.05);
  for (let i = 0; i < 2; i++) {
    g.fillStyle = grey(168);
    g.fillRect(i * (S / 2), 0, 3, S);
    g.fillRect(0, i * (S / 2), S, 3);
  }
  return c;
}

function asphalt(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(29);
  g.fillStyle = grey(232);
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, rng, 14000, 0.06);
  for (let i = 0; i < 10; i++) {
    const x = rng.range(0, S);
    const y = rng.range(0, S);
    const r = rng.range(20, 80);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(0,0,0,${rng.range(0.03, 0.08)})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = 'rgba(40,40,40,0.35)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    let x = rng.range(0, S);
    let y = rng.range(0, S);
    g.moveTo(x, y);
    for (let k = 0; k < 10; k++) {
      x += rng.range(-16, 16);
      y += rng.range(-16, 16);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
}

function gravel(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(67);
  g.fillStyle = grey(225);
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = grey(rng.range(170, 255));
    const s = rng.range(2, 6);
    g.fillRect(rng.range(0, S), rng.range(0, S), s, s * rng.range(0.6, 1));
  }
  return c;
}

function field(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(71);
  const rows = 16;
  for (let i = 0; i < rows; i++) {
    const y = (i * S) / rows;
    const grd = g.createLinearGradient(0, y, 0, y + S / rows);
    grd.addColorStop(0, grey(250));
    grd.addColorStop(0.55, grey(225));
    grd.addColorStop(1, grey(180));
    g.fillStyle = grd;
    g.fillRect(0, y, S, S / rows);
  }
  speckle(g, S, S, rng, 8000, 0.08);
  return c;
}

function planks(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(31);
  const n = 12;
  const ph = S / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = grey(rng.range(206, 240));
    g.fillRect(0, i * ph, S, ph);
    for (let k = 0; k < 10; k++) {
      g.fillStyle = `rgba(0,0,0,${rng.range(0.03, 0.08)})`;
      g.fillRect(0, i * ph + rng.range(2, ph - 2), S, 1);
    }
    g.fillStyle = grey(140);
    g.fillRect(0, i * ph + ph - 2, S, 2);
    g.fillRect(rng.range(0, S), i * ph, 2, ph);
  }
  return c;
}

function rollup(): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  for (let i = 0; i < 16; i++) {
    const y = i * 32;
    const grd = g.createLinearGradient(0, y, 0, y + 32);
    grd.addColorStop(0, grey(250));
    grd.addColorStop(1, grey(200));
    g.fillStyle = grd;
    g.fillRect(0, y, S, 32);
    g.fillStyle = grey(140);
    g.fillRect(0, y + 30, S, 2);
  }
  return c;
}

function stripes(a: string, b: string): HTMLCanvasElement {
  const [c, g] = makeCanvas(S, S);
  for (let i = 0; i < 2; i++) {
    g.fillStyle = a;
    g.fillRect(i * 256, 0, 128, S);
    g.fillStyle = b;
    g.fillRect(i * 256 + 128, 0, 128, S);
  }
  return c;
}

export interface LayerDef {
  name: string;
  canvas: HTMLCanvasElement;
  tile: number;
  rough: number;
  metal: number;
}

/** Every tiling surface used by the town, packed later into one texture array. */
export function createLayers(): LayerDef[] {
  const L = (name: string, canvas: HTMLCanvasElement, tile: number, rough = 0.9, metal = 0): LayerDef => ({ name, canvas, tile, rough, metal });
  return [
    L('brickRed', brick('#a4473a', '#cfc6bb', 3), 2.6, 0.92),
    L('brickTan', brick('#c9a77c', '#e6dccd', 5), 2.6, 0.92),
    L('brickPaint', brick('#ecebe6', '#cfcdc6', 9), 2.6, 0.9),
    L('brickBrown', brick('#7c4a35', '#c2b4a4', 13), 2.6, 0.92),
    L('brickPurple', brick('#5e3d5c', '#b6a9b0', 17), 2.6, 0.92),
    L('brickDark', brick('#7a3328', '#a89a8f', 21), 2.6, 0.92),
    L('siding', lapSiding(), 2.0, 0.86),
    L('boards', boardBatten(), 2.0, 0.9),
    L('roofMetal', roofMetal(), 3.2, 0.5, 0.3),
    L('shingle', shingle(), 2.0, 0.95),
    L('cinder', cinder(), 2.4, 0.92),
    L('concrete', concrete(), 3.0, 0.95),
    L('asphalt', asphalt(), 10, 0.95),
    L('planks', planks(), 2.0, 0.9),
    L('rollup', rollup(), 2.0, 0.55, 0.3),
    L('awningRed', stripes('#9b2335', '#f4f0e6'), 1.0, 0.8),
    L('awningGreen', stripes('#2f6b4a', '#f4f0e6'), 1.0, 0.8),
    L('awningBlue', stripes('#2a4f8c', '#f4f0e6'), 1.0, 0.8),
    L('stone', stone(), 3.0, 0.88),
    L('corrugated', corrugated(), 2.0, 0.45, 0.45),
    L('stucco', stucco(), 3.0, 0.95),
    L('gravel', gravel(), 4.0, 0.97),
    L('field', field(), 6.0, 0.98),
  ];
}

// ---------------------------------------------------------------- signage (canvases packed into an atlas)

export interface Line {
  text: string;
  font: string;
  color: string;
  y: number; // 0..1 vertical centre
  size: number; // fraction of height
  stroke?: string;
  strokeW?: number;
  maxW?: number; // fraction of width
  weight?: string;
  shadow?: boolean;
  letter?: number;
  x?: number; // 0..1 horizontal centre
}

export function drawLines(g: Ctx2D, w: number, h: number, lines: Line[]) {
  for (const l of lines) {
    let size = l.size * h;
    const maxW = (l.maxW ?? 0.9) * w;
    const fontStr = () => `${l.weight ?? ''} ${size}px "${l.font}", sans-serif`;
    g.font = fontStr();
    if (l.letter) (g as unknown as { letterSpacing: string }).letterSpacing = `${l.letter}px`;
    while (g.measureText(l.text).width > maxW && size > 8) {
      size *= 0.95;
      g.font = fontStr();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const x = (l.x ?? 0.5) * w;
    const y = l.y * h;
    if (l.shadow) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillText(l.text, x + size * 0.04, y + size * 0.05);
    }
    if (l.stroke) {
      g.lineJoin = 'round';
      g.strokeStyle = l.stroke;
      g.lineWidth = l.strokeW ?? size * 0.12;
      g.strokeText(l.text, x, y);
    }
    g.fillStyle = l.color;
    g.fillText(l.text, x, y);
    (g as unknown as { letterSpacing: string }).letterSpacing = '0px';
  }
}

export function roundRect(g: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if (r <= 0) {
    g.rect(x, y, w, h);
    return;
  }
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function panelSign(
  w: number,
  h: number,
  bg: string | null,
  lines: Line[],
  o: { border?: string; borderW?: number; inner?: string; radius?: number; draw?: (g: Ctx2D, w: number, h: number) => void } = {},
): HTMLCanvasElement {
  const [c, g] = makeCanvas(w, h);
  if (bg) {
    g.fillStyle = bg;
    roundRect(g, 0, 0, w, h, o.radius ?? 0);
    g.fill();
  }
  if (o.border) {
    const bw = o.borderW ?? h * 0.06;
    g.strokeStyle = o.border;
    g.lineWidth = bw;
    roundRect(g, bw / 2, bw / 2, w - bw, h - bw, o.radius ?? 0);
    g.stroke();
  }
  if (o.inner) {
    const bw = (o.borderW ?? h * 0.06) * 1.8;
    g.strokeStyle = o.inner;
    g.lineWidth = 2;
    roundRect(g, bw, bw, w - bw * 2, h - bw * 2, o.radius ?? 0);
    g.stroke();
  }
  o.draw?.(g, w, h);
  drawLines(g, w, h, lines);
  return c;
}

export function textOnly(w: number, h: number, lines: Line[]): HTMLCanvasElement {
  return panelSign(w, h, null, lines);
}

export function star(g: Ctx2D, cx: number, cy: number, R: number, r: number, fill: string) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

/** US flag; also used as a background for banners. */
export function drawFlag(g: Ctx2D, x: number, y: number, W: number, H: number, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  for (let i = 0; i < 13; i++) {
    g.fillStyle = i % 2 ? '#f5f2ea' : '#b22234';
    g.fillRect(x, y + (i * H) / 13, W, H / 13 + 1);
  }
  g.fillStyle = '#3c3b6e';
  g.fillRect(x, y, W * 0.4, (H * 7) / 13);
  const sx = (W * 0.4) / 12.5;
  const sy = ((H * 7) / 13) / 10;
  for (let r = 0; r < 9; r++)
    for (let k = 0; k < (r % 2 ? 5 : 6); k++) star(g, x + sx * (1 + k * 2 + (r % 2 ? 1 : 0)), y + sy * (1 + r), sx * 0.55, sx * 0.22, '#ffffff');
  g.restore();
}

export function flagCanvas(): HTMLCanvasElement {
  const [c, g] = makeCanvas(380, 200);
  drawFlag(g, 0, 0, 380, 200);
  return c;
}

export function stopSign(): HTMLCanvasElement {
  const SZ = 256;
  const [c, g] = makeCanvas(SZ, SZ);
  const oct = (r: number, fill: string) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      g.lineTo(SZ / 2 + Math.cos(a) * r, SZ / 2 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  oct(127, '#ffffff');
  oct(117, '#c8102e');
  drawLines(g, SZ, SZ, [{ text: 'STOP', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.52, size: 0.34, maxW: 0.78 }]);
  return c;
}

export function diamondSign(kind: 'ped' | 'curve' | 'deer' | 'tractor'): HTMLCanvasElement {
  const SZ = 256;
  const [c, g] = makeCanvas(SZ, SZ);
  const dia = (r: number, fill: string) => {
    g.beginPath();
    g.moveTo(SZ / 2, SZ / 2 - r);
    g.lineTo(SZ / 2 + r, SZ / 2);
    g.lineTo(SZ / 2, SZ / 2 + r);
    g.lineTo(SZ / 2 - r, SZ / 2);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  dia(127, '#1b1b1b');
  dia(119, '#f4c51b');
  g.strokeStyle = '#111';
  g.fillStyle = '#111';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (kind === 'ped') {
    g.lineWidth = 12;
    g.beginPath();
    g.arc(132, 70, 14, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(128, 92);
    g.lineTo(120, 150);
    g.lineTo(100, 195);
    g.moveTo(120, 150);
    g.lineTo(146, 192);
    g.moveTo(126, 104);
    g.lineTo(98, 132);
    g.moveTo(126, 104);
    g.lineTo(156, 128);
    g.stroke();
  } else if (kind === 'curve') {
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(110, 190);
    g.quadraticCurveTo(110, 110, 150, 90);
    g.stroke();
  } else if (kind === 'deer') {
    // leaping deer silhouette
    g.beginPath();
    g.moveTo(72, 150);
    g.lineTo(96, 128);
    g.lineTo(150, 122);
    g.lineTo(172, 98);
    g.lineTo(186, 92);
    g.lineTo(192, 104);
    g.lineTo(178, 114);
    g.lineTo(168, 140);
    g.lineTo(186, 176);
    g.lineTo(176, 180);
    g.lineTo(150, 150);
    g.lineTo(112, 156);
    g.lineTo(88, 186);
    g.lineTo(78, 182);
    g.lineTo(92, 158);
    g.closePath();
    g.fill();
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(176, 94);
    g.lineTo(170, 70);
    g.moveTo(172, 80);
    g.lineTo(160, 72);
    g.moveTo(182, 92);
    g.lineTo(190, 70);
    g.stroke();
  } else {
    // tractor
    g.lineWidth = 10;
    g.beginPath();
    g.arc(95, 160, 28, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(170, 172, 16, 0, Math.PI * 2);
    g.stroke();
    g.fillRect(90, 110, 50, 30);
    g.fillRect(140, 128, 40, 22);
    g.fillRect(96, 78, 8, 34);
  }
  return c;
}

export function routeShield(num: string, state = false): HTMLCanvasElement {
  const SZ = 256;
  const [c, g] = makeCanvas(SZ, SZ);
  if (state) {
    g.fillStyle = '#111';
    roundRect(g, 8, 8, SZ - 16, SZ - 16, 20);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(SZ / 2, SZ / 2, 100, 0, Math.PI * 2);
    g.fill();
    drawLines(g, SZ, SZ, [{ text: num, font: 'Oswald', weight: '700', color: '#111', y: 0.53, size: 0.5, maxW: 0.6 }]);
    return c;
  }
  g.fillStyle = '#111';
  g.fillRect(8, 8, SZ - 16, SZ - 16);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(40, 34);
  g.quadraticCurveTo(SZ / 2, 52, SZ - 40, 34);
  g.lineTo(SZ - 30, 150);
  g.quadraticCurveTo(SZ - 50, 210, SZ / 2, 232);
  g.quadraticCurveTo(50, 210, 30, 150);
  g.closePath();
  g.fill();
  drawLines(g, SZ, SZ, [{ text: num, font: 'Oswald', weight: '700', color: '#111', y: 0.52, size: 0.42, maxW: 0.6 }]);
  return c;
}

export function lawDoor(title: string, sub: string, starCol = '#c9a227', ink = '#141414'): HTMLCanvasElement {
  const W = 512;
  const H = 256;
  const [c, g] = makeCanvas(W, H);
  star(g, 70, 128, 58, 26, starCol);
  star(g, 70, 128, 44, 19, shade(starCol, 0.12));
  g.save();
  g.translate(64, 0);
  drawLines(g, W - 64, H, [
    { text: title, font: 'Oswald', weight: '700', color: ink, y: 0.44, size: 0.42, maxW: 0.66, x: 0.56 },
    { text: sub, font: 'Oswald', weight: '600', color: ink, y: 0.8, size: 0.18, maxW: 0.5, x: 0.56 },
  ]);
  g.restore();
  return c;
}

/** Round "86" logo + GASOLINE wordmark used on the canopy and pylon. */
export function gasLogo(withWord: boolean): HTMLCanvasElement {
  const W = withWord ? 1024 : 256;
  const H = 256;
  const [c, g] = makeCanvas(W, H);
  if (withWord) {
    g.fillStyle = '#f7f5ef';
    roundRect(g, 0, 0, W, H, 18);
    g.fill();
  }
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e2381f';
  g.beginPath();
  g.arc(128, 128, 112, 0, Math.PI * 2);
  g.fill();
  g.font = '700 130px "Oswald"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#7a1a0c';
  g.strokeText('86', 128, 134);
  g.fillStyle = '#ffd21f';
  g.fillText('86', 128, 134);
  if (withWord) {
    g.font = '700 150px "Oswald"';
    g.textAlign = 'left';
    g.fillStyle = '#2b2b2b';
    g.fillText('GASOLINE', 280, 138);
  }
  return c;
}

export function clockFace(): HTMLCanvasElement {
  const SZ = 256;
  const [c, g] = makeCanvas(SZ, SZ);
  g.fillStyle = '#1d1d1d';
  g.beginPath();
  g.arc(128, 128, 127, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f6f2e6';
  g.beginPath();
  g.arc(128, 128, 116, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1d1d1d';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save();
    g.translate(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98);
    g.rotate(a);
    g.fillRect(-3, -10, 6, i % 3 === 0 ? 22 : 14);
    g.restore();
  }
  g.lineCap = 'round';
  g.strokeStyle = '#1d1d1d';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(128, 128);
  g.lineTo(128 + Math.sin(-0.9) * 56, 128 - Math.cos(-0.9) * 56);
  g.stroke();
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(128, 128);
  g.lineTo(128 + Math.sin(2.1) * 86, 128 - Math.cos(2.1) * 86);
  g.stroke();
  g.beginPath();
  g.arc(128, 128, 9, 0, Math.PI * 2);
  g.fill();
  return c;
}

/** Vertical lettered blade sign (LIQUOR, MOTEL, LIBERTY…). */
export function verticalSign(text: string, bg: string, fg: string, font: string, border: string, bulbs = false): HTMLCanvasElement {
  const W = 220;
  const H = Math.round(220 * text.length * 0.82 + 60);
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = border;
  g.lineWidth = 14;
  g.strokeRect(7, 7, W - 14, H - 14);
  if (bulbs) {
    g.fillStyle = '#fff3c4';
    for (let y = 24; y < H - 16; y += 26) {
      g.beginPath();
      g.arc(22, y, 6, 0, Math.PI * 2);
      g.arc(W - 22, y, 6, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 160px "${font}"`;
  const step = (H - 60) / text.length;
  [...text].forEach((ch, i) => g.fillText(ch, W / 2, 30 + step * (i + 0.5) + 6));
  return c;
}

/** Theatre marquee with black letter-board rows and a bulb border. */
export function marquee(title: string, line2: string): HTMLCanvasElement {
  const W = 1024;
  const H = 300;
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = '#f5efe0';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#c8262c';
  g.fillRect(0, 0, W, 40);
  g.fillRect(0, H - 40, W, 40);
  g.fillStyle = '#fff6c9';
  for (let x = 18; x < W; x += 34) {
    g.beginPath();
    g.arc(x, 20, 8, 0, Math.PI * 2);
    g.arc(x, H - 20, 8, 0, Math.PI * 2);
    g.fill();
  }
  drawLines(g, W, H, [
    { text: title, font: 'Bebas Neue', color: '#141414', y: 0.38, size: 0.3, letter: 8 },
    { text: line2, font: 'Bebas Neue', color: '#141414', y: 0.66, size: 0.22, letter: 6 },
  ]);
  return c;
}

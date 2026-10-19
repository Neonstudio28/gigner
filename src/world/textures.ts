import * as THREE from 'three';
import { Rng } from './core/rng';

type Ctx2D = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function toTex(c: HTMLCanvasElement, tileM?: number | [number, number], wrap = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (tileM) {
    const [a, b] = Array.isArray(tileM) ? tileM : [tileM, tileM];
    t.repeat.set(1 / a, 1 / b);
  }
  return t;
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

// ---------------------------------------------------------------- tiling surfaces

export function brickTexture(brick: string, mortar: string, seed: number): THREE.CanvasTexture {
  const S = 1024;
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
      g.fillStyle = shade(brick, rng.range(-0.06, 0.05));
      g.fillRect(i * bw + off + 2, r * rh + 2, bw - 4, rh - 4);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(i * bw + off + 2, r * rh + 2, bw - 4, 3);
    }
  }
  speckle(g, S, S, rng, 5000, 0.08);
  return toTex(c, 2.6);
}

/** Greyscale multiply textures: the vertex colour supplies the hue. */
export function lapSidingTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 2.0);
}

export function boardBattenTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 2.0);
}

export function roofMetalTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 3.2);
}

export function shingleTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 2.0);
}

export function cinderTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 2.4);
}

export function concreteTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 3.0);
}

export function asphaltTexture(): THREE.CanvasTexture {
  const S = 1024;
  const [c, g] = makeCanvas(S, S);
  const rng = new Rng(29);
  g.fillStyle = grey(232);
  g.fillRect(0, 0, S, S);
  speckle(g, S, S, rng, 30000, 0.06);
  // soft patches
  for (let i = 0; i < 14; i++) {
    const x = rng.range(0, S);
    const y = rng.range(0, S);
    const r = rng.range(40, 160);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(0,0,0,${rng.range(0.03, 0.08)})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // crack sealant lines
  g.strokeStyle = 'rgba(40,40,40,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    let x = rng.range(0, S);
    let y = rng.range(0, S);
    g.moveTo(x, y);
    for (let k = 0; k < 12; k++) {
      x += rng.range(-30, 30);
      y += rng.range(-30, 30);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return toTex(c, 14);
}

export function planksTexture(): THREE.CanvasTexture {
  const S = 512;
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
  return toTex(c, 2.0);
}

export function rollupTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  for (let i = 0; i < 8; i++) {
    const y = i * 32;
    const grd = g.createLinearGradient(0, y, 0, y + 32);
    grd.addColorStop(0, grey(250));
    grd.addColorStop(1, grey(200));
    g.fillStyle = grd;
    g.fillRect(0, y, S, 32);
    g.fillStyle = grey(140);
    g.fillRect(0, y + 30, S, 2);
  }
  return toTex(c, 1.0);
}

export function stripeTexture(a: string, b: string): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 16);
  g.fillStyle = a;
  g.fillRect(0, 0, 64, 16);
  g.fillStyle = b;
  g.fillRect(64, 0, 64, 16);
  return toTex(c, [1.0, 1.0]);
}

// ---------------------------------------------------------------- signage

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
    const y = l.y * h;
    if (l.shadow) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillText(l.text, w / 2 + size * 0.04, y + size * 0.05);
    }
    if (l.stroke) {
      g.lineJoin = 'round';
      g.strokeStyle = l.stroke;
      g.lineWidth = l.strokeW ?? size * 0.12;
      g.strokeText(l.text, w / 2, y);
    }
    g.fillStyle = l.color;
    g.fillText(l.text, w / 2, y);
    (g as unknown as { letterSpacing: string }).letterSpacing = '0px';
  }
}

export function panelSign(
  w: number,
  h: number,
  bg: string | null,
  lines: Line[],
  o: { border?: string; borderW?: number; inner?: string; radius?: number; draw?: (g: Ctx2D, w: number, h: number) => void } = {},
): THREE.CanvasTexture {
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
  return toTex(c, undefined, false);
}

function roundRect(g: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
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

function star(g: Ctx2D, cx: number, cy: number, R: number, r: number, fill: string) {
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

export function flagTexture(): THREE.CanvasTexture {
  const W = 380;
  const H = 200;
  const [c, g] = makeCanvas(W, H);
  for (let i = 0; i < 13; i++) {
    g.fillStyle = i % 2 ? '#f5f2ea' : '#b22234';
    g.fillRect(0, (i * H) / 13, W, H / 13 + 1);
  }
  g.fillStyle = '#3c3b6e';
  g.fillRect(0, 0, W * 0.4, (H * 7) / 13);
  for (let r = 0; r < 9; r++)
    for (let k = 0; k < (r % 2 ? 5 : 6); k++) {
      const x = 12 + k * 25 + (r % 2 ? 12 : 0);
      const y = 9 + r * 10.5;
      star(g, x, y, 4, 1.8, '#ffffff');
    }
  return toTex(c, undefined, false);
}

export function stopSignTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  const oct = (r: number, fill: string) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      g.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  oct(127, '#ffffff');
  oct(117, '#c8102e');
  drawLines(g, S, S, [{ text: 'STOP', font: 'Oswald', weight: '700', color: '#ffffff', y: 0.52, size: 0.34, maxW: 0.78 }]);
  return toTex(c, undefined, false);
}

export function diamondSignTexture(kind: 'ped' | 'curve'): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  const dia = (r: number, fill: string) => {
    g.beginPath();
    g.moveTo(S / 2, S / 2 - r);
    g.lineTo(S / 2 + r, S / 2);
    g.lineTo(S / 2, S / 2 + r);
    g.lineTo(S / 2 - r, S / 2);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  dia(127, '#1b1b1b');
  dia(119, '#f4c51b');
  g.strokeStyle = '#111';
  g.fillStyle = '#111';
  g.lineCap = 'round';
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
  } else {
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(110, 190);
    g.quadraticCurveTo(110, 110, 150, 90);
    g.stroke();
  }
  return toTex(c, undefined, false);
}

export function routeShieldTexture(num: string): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  g.fillStyle = '#111';
  g.fillRect(8, 8, S - 16, S - 16);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(40, 34);
  g.quadraticCurveTo(S / 2, 52, S - 40, 34);
  g.lineTo(S - 30, 150);
  g.quadraticCurveTo(S - 50, 210, S / 2, 232);
  g.quadraticCurveTo(50, 210, 30, 150);
  g.closePath();
  g.fill();
  drawLines(g, S, S, [{ text: num, font: 'Oswald', weight: '700', color: '#111', y: 0.52, size: 0.42, maxW: 0.6 }]);
  return toTex(c, undefined, false);
}

export function sheriffDoorTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const [c, g] = makeCanvas(W, H);
  star(g, 70, 128, 58, 26, '#c9a227');
  star(g, 70, 128, 44, 19, '#e4c04a');
  drawLines(g, W, H, [
    { text: 'SHERIFF', font: 'Oswald', weight: '700', color: '#141414', y: 0.44, size: 0.42, maxW: 0.66 },
    { text: 'COUNTY', font: 'Oswald', weight: '600', color: '#141414', y: 0.8, size: 0.18, maxW: 0.4 },
  ]);
  // shift text right of the star
  const shifted = makeCanvas(W, H);
  shifted[1].drawImage(c, 0, 0, 140, H, 0, 0, 140, H);
  shifted[1].drawImage(c, 0, 0, W, H, 60, 0, W, H);
  const t = new THREE.CanvasTexture(shifted[0]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function textOnly(w: number, h: number, lines: Line[]): THREE.CanvasTexture {
  return panelSign(w, h, null, lines);
}

/** Round "86" logo + GASOLINE wordmark used on the canopy and pylon. */
export function gasLogoTexture(withWord: boolean): THREE.CanvasTexture {
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
  return toTex(c, undefined, false);
}

export interface TextureSet {
  brickRed: THREE.Texture;
  brickTan: THREE.Texture;
  brickPaint: THREE.Texture;
  brickBrown: THREE.Texture;
  siding: THREE.Texture;
  boards: THREE.Texture;
  roofMetal: THREE.Texture;
  shingle: THREE.Texture;
  cinder: THREE.Texture;
  concrete: THREE.Texture;
  asphalt: THREE.Texture;
  planks: THREE.Texture;
  rollup: THREE.Texture;
  awningRed: THREE.Texture;
  awningGreen: THREE.Texture;
}

export function createTextures(): TextureSet {
  return {
    brickRed: brickTexture('#a4473a', '#cfc6bb', 3),
    brickTan: brickTexture('#c9a77c', '#e6dccd', 5),
    brickPaint: brickTexture('#ecebe6', '#cfcdc6', 9),
    brickBrown: brickTexture('#7c4a35', '#c2b4a4', 13),
    siding: lapSidingTexture(),
    boards: boardBattenTexture(),
    roofMetal: roofMetalTexture(),
    shingle: shingleTexture(),
    cinder: cinderTexture(),
    concrete: concreteTexture(),
    asphalt: asphaltTexture(),
    planks: planksTexture(),
    rollup: rollupTexture(),
    awningRed: stripeTexture('#9b2335', '#f4f0e6'),
    awningGreen: stripeTexture('#2f6b4a', '#f4f0e6'),
  };
}

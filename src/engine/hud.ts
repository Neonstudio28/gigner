import * as THREE from 'three';
import type { TownWorld } from '../world';
import { heightAt, groundColor, isWater, forestDensity, MAP_RADIUS, river, LAKE, PEAKS } from '../world/terrain';
import { DISTRICTS, districtAt, KIND_COLORS } from '../world/plan/districts';
import { EXITS, i90z } from '../world/plan/roads';

const EXTENT = 1950;
const RASTER = 420;

/** The town map covers the whole valley floor (x east, z south). */
const MAP = { x0: -1860, x1: 1860, z0: -860, z1: 760 };
const BIG_W = 2000;
const BIG_H = Math.round((BIG_W * (MAP.z1 - MAP.z0)) / (MAP.x1 - MAP.x0));

/** "Street · District" when on a named road, otherwise the district (or the forest). */
export function locationName(world: TownWorld, x: number, z: number): string {
  const d = districtAt(x, z);
  const hit = world.roadAt(x, z);
  const label = hit ? (hit.road.def.label ?? hit.road.def.name) : '';
  const area = d ? d.name : forestDensity(x, z) > 0.4 ? 'Cascade Forest' : 'Pine Valley';
  if (label && hit && hit.road.kind === 'interstate') return 'I-90';
  return label ? `${label} · ${area.split(' · ')[0]}` : area;
}

const LANDMARK_COLORS: Record<string, string> = {
  emergency: '#d8322a',
  civic: '#3d6aa8',
  school: '#d9a520',
  business: '#d9702a',
  industrial: '#6b6f75',
  park: '#3f8a3a',
  rural: '#8a6a3a',
  residential: '#8a5a8a',
};
const LANDMARK_ORDER = ['emergency', 'civic', 'school', 'industrial', 'park', 'business', 'rural', 'residential'];

/** Speedometer, location readout, heading-up minimap and a labelled town map (M). */
export class DriveHUD {
  readonly el: HTMLDivElement;
  private spd: HTMLElement;
  private gear: HTMLElement;
  private loc: HTMLElement;
  private surface: HTMLElement;
  private mini: HTMLCanvasElement;
  private big: HTMLCanvasElement;
  private raster: HTMLCanvasElement;
  private bigBase: HTMLCanvasElement | null = null;
  bigMap = false;

  constructor(private world: TownWorld) {
    this.el = document.createElement('div');
    this.el.id = 'drive-hud';
    this.el.innerHTML = `
      <canvas class="minimap" width="440" height="440"></canvas>
      <div class="speedo"><span class="spd">0</span><span class="unit">MPH</span><span class="gear">D</span></div>
      <div class="loc"></div><div class="surface"></div>
      <div class="drive-keys">W/S drive · A/D steer · Space handbrake · Shift boost · C camera · R reset · M map · drag to look · V/Esc exit</div>
      <canvas class="bigmap" width="${BIG_W}" height="${BIG_H}"></canvas>`;
    document.body.appendChild(this.el);
    this.spd = this.el.querySelector('.spd')!;
    this.gear = this.el.querySelector('.gear')!;
    this.loc = this.el.querySelector('.loc')!;
    this.surface = this.el.querySelector('.surface')!;
    this.mini = this.el.querySelector('.minimap')!;
    this.big = this.el.querySelector('.bigmap')!;
    this.raster = this.buildRaster();
  }

  private buildRaster(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = RASTER;
    const g = c.getContext('2d')!;
    const img = g.createImageData(RASTER, RASTER);
    const col = new THREE.Color();
    for (let j = 0; j < RASTER; j++)
      for (let i = 0; i < RASTER; i++) {
        const x = -EXTENT + ((i + 0.5) / RASTER) * EXTENT * 2;
        const z = -EXTENT + ((j + 0.5) / RASTER) * EXTENT * 2;
        if (isWater(x, z)) col.setHex(0x4f86a8);
        else if (Math.hypot(x, z) > MAP_RADIUS) col.setHex(0x3a4434);
        else groundColor(x, heightAt(x, z), z, 1, col);
        col.convertLinearToSRGB();
        const o = (j * RASTER + i) * 4;
        img.data[o] = col.r * 255;
        img.data[o + 1] = col.g * 255;
        img.data[o + 2] = col.b * 255;
        img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    return c;
  }

  /** Hill-shaded terrain for the town map (built once, the first time the map opens). */
  private buildMapRaster(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(w, h);
    const col = new THREE.Color();
    const dx = (MAP.x1 - MAP.x0) / w;
    const dz = (MAP.z1 - MAP.z0) / h;
    const light = new THREE.Vector3(-0.6, 0.75, -0.5).normalize();
    const n = new THREE.Vector3();
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const x = MAP.x0 + (i + 0.5) * dx;
        const z = MAP.z0 + (j + 0.5) * dz;
        let shade = 1;
        if (isWater(x, z)) col.setHex(0x5b93b5);
        else {
          const y = heightAt(x, z);
          const yx = heightAt(x + dx, z);
          const yz = heightAt(x, z + dz);
          n.set(y - yx, dx, y - yz).normalize();
          groundColor(x, y, z, n.y, col);
          shade = THREE.MathUtils.clamp(0.72 + 0.5 * n.dot(light), 0.55, 1.15);
        }
        col.convertLinearToSRGB();
        const o = (j * w + i) * 4;
        img.data[o] = Math.min(255, col.r * 255 * shade);
        img.data[o + 1] = Math.min(255, col.g * 255 * shade);
        img.data[o + 2] = Math.min(255, col.b * 255 * shade);
        img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    return c;
  }

  private roadColor(kind: string, rank: number) {
    if (kind === 'highway') return '#f2c94c';
    if (kind === 'dirt') return '#c8b48a';
    if (kind === 'alley') return '#c9ccd1';
    return rank >= 6 ? '#ffffff' : '#ecebe6';
  }

  /** Roads (with casing) and building footprints in world units; the caller sets the transform. */
  private drawWorld(g: CanvasRenderingContext2D, px: number, pz: number, range: number, casing: number, colourBuildings: boolean) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.fillStyle = 'rgba(220,196,110,0.75)';
    for (const f of this.world.map.fields) g.fillRect(f.x - f.w / 2, f.z - f.d / 2, f.w, f.d);
    const roads = [...this.world.map.roads].sort((a, b) => a.rank - b.rank);
    const visible = (r: (typeof roads)[number]) => !(r.pts.every(([x, z]) => Math.abs(x - px) > range || Math.abs(z - pz) > range) && Math.abs(r.pts[0][0] - px) > range * 3);
    const path = (r: (typeof roads)[number]) => {
      g.beginPath();
      r.pts.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
    };
    if (casing > 0)
      for (const r of roads) {
        if (!visible(r)) continue;
        g.strokeStyle = 'rgba(48,52,58,0.85)';
        g.lineWidth = Math.max(r.w, 3) + casing;
        path(r);
        g.stroke();
        if (r.culdesac) {
          g.fillStyle = 'rgba(48,52,58,0.85)';
          g.beginPath();
          g.arc(r.culdesac.x, r.culdesac.z, r.culdesac.R + casing / 2, 0, Math.PI * 2);
          g.fill();
        }
      }
    for (const r of roads) {
      if (!visible(r)) continue;
      const c = this.roadColor(r.kind, r.rank);
      g.strokeStyle = c;
      g.lineWidth = Math.max(r.w, 3);
      path(r);
      g.stroke();
      if (r.culdesac) {
        g.fillStyle = c;
        g.beginPath();
        g.arc(r.culdesac.x, r.culdesac.z, r.culdesac.R, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const s of this.world.map.solids) {
      if (Math.abs(s.cx - px) > range || Math.abs(s.cz - pz) > range) continue;
      const d = colourBuildings ? districtAt(s.cx, s.cz) : null;
      g.fillStyle = d ? KIND_COLORS[d.kind] : '#6b5a4c';
      g.save();
      g.translate(s.cx, s.cz);
      g.rotate(-s.ry);
      g.fillRect(-s.hw, -s.hd, s.hw * 2, s.hd * 2);
      g.restore();
    }
  }

  setVisible(v: boolean) {
    this.el.classList.toggle('show', v);
    if (!v) this.setBig(false);
  }

  setBig(v: boolean) {
    this.bigMap = v;
    this.big.classList.toggle('show', v);
  }

  update(x: number, z: number, heading: number, speed: number, onRoad: boolean, gear = 0, weather = '', onFoot = false) {
    const mph = Math.abs(speed) * 2.23694;
    this.spd.textContent = mph.toFixed(0);
    this.gear.textContent = onFoot ? '' : gear < 0 ? 'R' : mph < 0.5 ? 'N' : gear > 0 ? String(gear) : 'D';
    this.loc.textContent = locationName(this.world, x, z);
    this.surface.textContent = [weather, onRoad ? '' : 'OFF-ROAD'].filter(Boolean).join('  ·  ');
    // minimap: heading-up, zooms out with speed
    const g = this.mini.getContext('2d')!;
    const W = this.mini.width;
    const zoom = W / (2 * (95 + Math.abs(speed) * 2.2));
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.arc(W / 2, W / 2, W / 2 - 6, 0, Math.PI * 2);
    g.clip();
    g.translate(W / 2, W / 2);
    g.rotate(heading - Math.PI / 2);
    g.scale(zoom, zoom);
    g.translate(-x, -z);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.raster, -EXTENT, -EXTENT, EXTENT * 2, EXTENT * 2);
    this.drawWorld(g, x, z, W / zoom, 0, false);
    g.restore();
    g.save();
    g.translate(W / 2, W / 2);
    g.fillStyle = '#ffd24a';
    g.strokeStyle = '#1b1b1b';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, -18);
    g.lineTo(12, 14);
    g.lineTo(0, 7);
    g.lineTo(-12, 14);
    g.closePath();
    g.fill();
    g.stroke();
    const na = heading - Math.PI;
    g.fillStyle = '#ffffff';
    g.font = '700 26px Oswald, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', Math.cos(na) * (W / 2 - 26), Math.sin(na) * (W / 2 - 26));
    g.restore();
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(20,24,30,0.85)';
    g.beginPath();
    g.arc(W / 2, W / 2, W / 2 - 6, 0, Math.PI * 2);
    g.stroke();
    if (this.bigMap) this.drawBig(x, z, heading);
  }

  /* ---------------------------------------------------------------- the town map */

  private drawBig(x: number, z: number, heading: number) {
    if (!this.bigBase) this.bigBase = this.buildBigBase();
    const g = this.big.getContext('2d')!;
    g.drawImage(this.bigBase, 0, 0);
    const s = BIG_W / (MAP.x1 - MAP.x0);
    const cx = (x - MAP.x0) * s;
    const cz = (z - MAP.z0) * s;
    g.save();
    g.translate(cx, cz);
    g.rotate(-heading + Math.PI / 2);
    g.fillStyle = '#ffd24a';
    g.strokeStyle = '#1b1b1b';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, -16);
    g.lineTo(11, 12);
    g.lineTo(0, 6);
    g.lineTo(-11, 12);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  private buildBigBase(): HTMLCanvasElement {
    const W = BIG_W;
    const H = BIG_H;
    const s = W / (MAP.x1 - MAP.x0);
    const sx = (x: number) => (x - MAP.x0) * s;
    const sz = (z: number) => (z - MAP.z0) * s;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = true;
    g.drawImage(this.buildMapRaster(Math.round(W / 3.6), Math.round(H / 3.6)), 0, 0, W, H);

    // district tint + outline (world units)
    g.save();
    g.scale(s, s);
    g.translate(-MAP.x0, -MAP.z0);
    for (const d of DISTRICTS) {
      if (d.kind === 'lake' || d.kind === 'rural') continue;
      g.beginPath();
      d.poly.forEach(([px, pz], i) => (i ? g.lineTo(px, pz) : g.moveTo(px, pz)));
      g.closePath();
      g.fillStyle = KIND_COLORS[d.kind] + '1c';
      g.fill();
      g.setLineDash([14, 10]);
      g.lineWidth = 3;
      g.strokeStyle = KIND_COLORS[d.kind] + '70';
      g.stroke();
      g.setLineDash([]);
    }
    this.drawWorld(g, 0, -50, 4000, 5, true);
    g.restore();

    const placed: [number, number, number, number][] = [];
    const free = (x0: number, y0: number, x1: number, y1: number) => !placed.some(([a, b, c2, d2]) => x0 < c2 && x1 > a && y0 < d2 && y1 > b) && x0 > 4 && y0 > 4 && x1 < W - 4 && y1 < H - 4;
    const text = (t: string, x: number, y: number, font: string, fill: string, o: { halo?: string; angle?: number; letter?: number; force?: boolean; haloW?: number } = {}) => {
      g.save();
      g.font = font;
      if (o.letter) (g as unknown as { letterSpacing: string }).letterSpacing = `${o.letter}px`;
      const m = g.measureText(t);
      const tw = m.width;
      const th = parseInt(font.match(/(\d+)px/)?.[1] ?? '12', 10);
      const ang = o.angle ?? 0;
      const ex = Math.abs(Math.cos(ang)) * tw + Math.abs(Math.sin(ang)) * th;
      const ey = Math.abs(Math.sin(ang)) * tw + Math.abs(Math.cos(ang)) * th;
      const box: [number, number, number, number] = [x - ex / 2 - 2, y - ey / 2 - 2, x + ex / 2 + 2, y + ey / 2 + 2];
      if (!o.force && !free(...box)) {
        g.restore();
        return false;
      }
      placed.push(box);
      g.translate(x, y);
      g.rotate(ang);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (o.halo) {
        g.lineJoin = 'round';
        g.strokeStyle = o.halo;
        g.lineWidth = o.haloW ?? 4;
        g.strokeText(t, 0, 0);
      }
      g.fillStyle = fill;
      g.fillText(t, 0, 0);
      g.restore();
      return true;
    };

    // water and highway labels
    text('SPIRIT LAKE', sx(LAKE.x), sz(LAKE.z), 'italic 600 26px Oswald, sans-serif', '#1f4f6b', { halo: 'rgba(255,255,255,0.75)', letter: 3, force: true });
    const rp = river.pts;
    for (const f of [0.18, 0.5]) {
      const p = rp[Math.floor(rp.length * f)];
      const q = rp[Math.floor(rp.length * f) + 6];
      let a = Math.atan2(sz(q.z) - sz(p.z), sx(q.x) - sx(p.x));
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;
      text('South Fork River', sx(p.x), sz(p.z), 'italic 600 15px Oswald, sans-serif', '#1f4f6b', { halo: 'rgba(255,255,255,0.7)', angle: a });
    }
    for (const p of PEAKS) if (p.x > MAP.x0 && p.x < MAP.x1 && p.z > MAP.z0 && p.z < MAP.z1) text(`▲ ${p.name}`, sx(p.x), sz(p.z), '600 13px Oswald, sans-serif', '#3a3d42', { halo: 'rgba(255,255,255,0.6)' });
    const shield = (x: number, label: string) => {
      const X = sx(x);
      const Y = sz(i90z(x));
      g.save();
      g.fillStyle = '#1f4f9b';
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(X - 13, Y - 12);
      g.lineTo(X + 13, Y - 12);
      g.lineTo(X + 13, Y + 3);
      g.quadraticCurveTo(X + 13, Y + 13, X, Y + 15);
      g.quadraticCurveTo(X - 13, Y + 13, X - 13, Y + 3);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#ffffff';
      g.font = '700 13px Oswald, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, X, Y + 1);
      g.restore();
      placed.push([X - 15, Y - 14, X + 15, Y + 17]);
    };
    for (const x of [-1500, -450, 600, 1600]) shield(x, '90');
    for (const e of EXITS) text(`EXIT ${e.n}`, sx(e.x), sz(i90z(e.x)) - 26, '700 12px Oswald, sans-serif', '#1b1b1d', { halo: '#f2c94c', haloW: 5, force: true });

    // district names
    for (const d of DISTRICTS) {
      if (d.minor || d.kind === 'lake') continue;
      text(d.name.toUpperCase(), sx(d.label[0]), sz(d.label[1]), '700 19px Oswald, sans-serif', '#ffffff', { halo: 'rgba(20,24,30,0.8)', haloW: 5, letter: 3, force: true });
    }

    // landmarks (dots always, names where they fit)
    const lms = [...this.world.map.landmarks].sort((a, b) => LANDMARK_ORDER.indexOf(a.kind) - LANDMARK_ORDER.indexOf(b.kind));
    for (const l of lms) {
      const X = sx(l.x);
      const Y = sz(l.z);
      g.fillStyle = LANDMARK_COLORS[l.kind] ?? '#555';
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(X, Y, 5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    for (const l of lms) {
      const X = sx(l.x);
      const Y = sz(l.z);
      const font = '600 12px Oswald, sans-serif';
      for (const [ox, oy] of [[0, -14], [0, 15], [60, 0], [-60, 0]]) if (text(l.name, X + ox, Y + oy, font, '#1b1b1d', { halo: 'rgba(255,255,255,0.85)', haloW: 4 })) break;
    }

    // street names along the longer roads
    const streets = this.world.map.roads.filter((r) => r.label && r.kind !== 'highway' && r.pts.length > 3).sort((a, b) => b.rank - a.rank || b.pts.length - a.pts.length);
    const named = new Set<string>();
    for (const r of streets) {
      if (named.has(r.label) && r.rank < 6) continue;
      const i = Math.floor(r.pts.length / 2);
      const [ax, az] = r.pts[Math.max(0, i - 2)];
      const [bx, bz] = r.pts[Math.min(r.pts.length - 1, i + 2)];
      let a = Math.atan2(sz(bz) - sz(az), sx(bx) - sx(ax));
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;
      const [mx, mz] = r.pts[i];
      if (text(r.label, sx(mx), sz(mz), `${r.rank >= 6 ? '700 12px' : '500 10px'} Oswald, sans-serif`, '#2b2d31', { halo: 'rgba(255,255,255,0.9)', haloW: 3, angle: a })) named.add(r.label);
    }

    // title cartouche, legend, compass, scale bar
    g.save();
    g.fillStyle = 'rgba(244,239,226,0.92)';
    g.strokeStyle = '#3d2f28';
    g.lineWidth = 3;
    g.fillRect(18, 18, 330, 92);
    g.strokeRect(18, 18, 330, 92);
    g.fillStyle = '#3d2f28';
    g.font = '400 44px Rye, serif';
    g.textBaseline = 'middle';
    g.fillText('Pine Hollow', 34, 56);
    g.font = '600 14px Oswald, sans-serif';
    (g as unknown as { letterSpacing: string }).letterSpacing = '3px';
    g.fillText('PINE COUNTY · EST. 1889 · POP. 4,212', 36, 92);
    g.restore();
    const legend: [string, string][] = [
      ['Downtown', KIND_COLORS.downtown],
      ['Civic', KIND_COLORS.civic],
      ['Commercial', KIND_COLORS.commercial],
      ['Residential', KIND_COLORS.residential],
      ['Suburban', KIND_COLORS.suburb],
      ['Estates', KIND_COLORS.estate],
      ['Industrial', KIND_COLORS.industrial],
      ['Medical', KIND_COLORS.medical],
      ['Schools', KIND_COLORS.school],
    ];
    const LX = 18;
    const LY = H - 18 - legend.length * 20 - 34;
    g.fillStyle = 'rgba(244,239,226,0.9)';
    g.fillRect(LX, LY, 170, legend.length * 20 + 34);
    g.strokeStyle = '#3d2f28';
    g.lineWidth = 2;
    g.strokeRect(LX, LY, 170, legend.length * 20 + 34);
    g.fillStyle = '#3d2f28';
    g.font = '700 14px Oswald, sans-serif';
    g.fillText('LEGEND', LX + 12, LY + 20);
    legend.forEach(([name, col], i) => {
      g.fillStyle = col;
      g.fillRect(LX + 12, LY + 32 + i * 20, 16, 12);
      g.fillStyle = '#2b2d31';
      g.font = '500 13px Oswald, sans-serif';
      g.fillText(name, LX + 36, LY + 43 + i * 20);
    });
    // compass
    const CX = W - 60;
    const CY = 76;
    g.save();
    g.translate(CX, CY);
    g.fillStyle = 'rgba(244,239,226,0.9)';
    g.beginPath();
    g.arc(0, 0, 36, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#3d2f28';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#c8262c';
    g.beginPath();
    g.moveTo(0, -28);
    g.lineTo(8, 0);
    g.lineTo(-8, 0);
    g.closePath();
    g.fill();
    g.fillStyle = '#3d2f28';
    g.beginPath();
    g.moveTo(0, 28);
    g.lineTo(8, 0);
    g.lineTo(-8, 0);
    g.closePath();
    g.fill();
    g.font = '700 16px Oswald, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#3d2f28';
    g.fillText('N', 0, -48);
    g.restore();
    // scale bar: 500 m
    const bar = 500 * s;
    const BX = W - 40 - bar;
    const BY = H - 34;
    g.fillStyle = 'rgba(244,239,226,0.9)';
    g.fillRect(BX - 12, BY - 26, bar + 24, 40);
    g.fillStyle = '#3d2f28';
    g.fillRect(BX, BY, bar, 6);
    g.fillStyle = '#f4efe2';
    g.fillRect(BX + bar / 2, BY + 1, bar / 2 - 1, 4);
    g.fillStyle = '#3d2f28';
    g.font = '600 12px Oswald, sans-serif';
    g.textAlign = 'center';
    g.fillText('0', BX, BY - 10);
    g.fillText('250 m', BX + bar / 2, BY - 10);
    g.fillText('500 m', BX + bar, BY - 10);
    return c;
  }
}

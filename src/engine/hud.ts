import * as THREE from 'three';
import type { TownWorld } from '../world';
import { heightAt, groundColor, isWater, forestDensity, MAP_RADIUS } from '../world/terrain';
import { FARMS } from '../world/farms';

const EXTENT = 1950;
const RASTER = 420;

interface Zone {
  name: string;
  test: (x: number, z: number) => boolean;
}

const inRect = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
const nearFarm = (x: number, z: number, f: { x: number; z: number; w: number; d: number }) => inRect(x, z, f.x - f.w / 2 - 15, f.x + f.w / 2 + 15, f.z - f.d / 2 - 15, f.z + f.d / 2 + 15);

const ZONES: Zone[] = [
  { name: 'I-90', test: (x, z) => z < -160 && z > -340 && Math.abs(x) < 1850 && near90(x, z) },
  { name: 'Bank Street · Downtown', test: (x, z) => inRect(x, z, -300, 300, -75, -25) },
  { name: 'Cedar Street · Downtown', test: (x, z) => inRect(x, z, -300, 300, -25, 40) },
  { name: 'Historic Downtown', test: (x, z) => inRect(x, z, -310, 310, -120, 90) },
  { name: 'Old Town', test: (x, z) => inRect(x, z, -320, 140, 90, 340) },
  { name: 'Placer Creek Canyon', test: (x, z) => inRect(x, z, 60, 260, 200, 480) },
  { name: 'Silver Heights', test: (x, z) => inRect(x, z, -1040, -430, -60, 260) },
  { name: 'Front Street Strip', test: (x, z) => inRect(x, z, 300, 1000, -110, 40) },
  { name: 'Riverside Mobile Home Park', test: (x, z) => inRect(x, z, 540, 690, -30, 130) },
  { name: 'Silver Valley Medical Center', test: (x, z) => inRect(x, z, 740, 860, 30, 200) },
  { name: 'Elm Crescent', test: (x, z) => inRect(x, z, 860, 1010, 60, 260) },
  { name: 'Cascade Lumber Mill', test: (x, z) => inRect(x, z, -1110, -900, -510, -400) },
  { name: 'Sierra Silver Mine', test: (x, z) => inRect(x, z, -900, -780, -540, -440) },
  { name: 'Substation 4', test: (x, z) => inRect(x, z, -1220, -1140, -510, -450) },
  { name: 'Miller Dairy', test: (x, z) => nearFarm(x, z, FARMS.dairy) },
  { name: 'Ridgeview Farm', test: (x, z) => nearFarm(x, z, FARMS.hay) },
  { name: 'Sunny Acres Orchard', test: (x, z) => nearFarm(x, z, FARMS.orchard) },
  { name: 'Hansen Farm', test: (x, z) => inRect(x, z, 1240, 1420, -170, -40) },
  { name: 'Spirit Lake', test: (x, z) => Math.hypot((x - 700) / 360, (z - 420) / 220) < 1 },
  { name: 'Old US-10 West', test: (x, z) => x < -300 && z > -140 && z < -40 },
  { name: 'Old US-10 East', test: (x, z) => x > 1000 && z > -80 && z < 40 },
  { name: 'Pine Hollow', test: (x, z) => Math.abs(x) < 1100 && z > -260 && z < 450 },
];
const near90 = (x: number, z: number) => {
  const zi = x < -700 ? -200 + (x + 1000) * -0.2 : x < -400 ? -300 : -210 + Math.max(0, -x - 200) * 0.25;
  return Math.abs(z - zi) < 40;
};

export function locationName(x: number, z: number): string {
  for (const zn of ZONES) if (zn.test(x, z)) return zn.name;
  return forestDensity(x, z) > 0.4 ? 'Cascade Forest' : 'Pine Valley';
}

/** Speedometer, location readout and heading-up minimap (M toggles a full map). */
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
      <canvas class="bigmap" width="1100" height="1100"></canvas>`;
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

  private drawWorld(g: CanvasRenderingContext2D, px: number, pz: number, range: number) {
    g.imageSmoothingEnabled = true;
    g.drawImage(this.raster, -EXTENT, -EXTENT, EXTENT * 2, EXTENT * 2);
    g.fillStyle = 'rgba(220,196,110,0.75)';
    for (const f of this.world.map.fields) g.fillRect(f.x - f.w / 2, f.z - f.d / 2, f.w, f.d);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const roads = [...this.world.map.roads].sort((a, b) => a.rank - b.rank);
    for (const r of roads) {
      const [x0, z0] = r.pts[0];
      if (r.pts.every(([x, z]) => Math.abs(x - px) > range || Math.abs(z - pz) > range) && Math.abs(x0 - px) > range * 3) continue;
      g.strokeStyle = r.kind === 'dirt' ? '#b49a74' : r.kind === 'alley' ? '#9a9da3' : r.kind === 'highway' ? '#f2d17a' : '#e4e6ea';
      g.lineWidth = Math.max(r.w, 3);
      g.beginPath();
      r.pts.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
      g.stroke();
    }
    g.fillStyle = '#6b5a4c';
    for (const s of this.world.map.solids) {
      if (Math.abs(s.cx - px) > range || Math.abs(s.cz - pz) > range) continue;
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

  update(x: number, z: number, heading: number, speed: number, onRoad: boolean) {
    const mph = Math.abs(speed) * 2.23694;
    this.spd.textContent = mph.toFixed(0);
    this.gear.textContent = speed < -0.3 ? 'R' : mph < 0.5 ? 'N' : 'D';
    this.loc.textContent = locationName(x, z);
    this.surface.textContent = onRoad ? '' : 'OFF-ROAD';
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
    this.drawWorld(g, x, z, W / zoom);
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

  private drawBig(x: number, z: number, heading: number) {
    const W = this.big.width;
    if (!this.bigBase) {
      this.bigBase = document.createElement('canvas');
      this.bigBase.width = this.bigBase.height = W;
      const g = this.bigBase.getContext('2d')!;
      g.translate(W / 2, W / 2);
      g.scale(W / (EXTENT * 2), W / (EXTENT * 2));
      this.drawWorld(g, 0, 0, EXTENT * 2);
    }
    const g = this.big.getContext('2d')!;
    g.drawImage(this.bigBase, 0, 0);
    const s = W / (EXTENT * 2);
    const cx = W / 2 + x * s;
    const cz = W / 2 + z * s;
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
}

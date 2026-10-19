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
  { name: 'Courthouse Square', test: (x, z) => inRect(x, z, -50, 50, -158, -82) },
  { name: 'Court Street', test: (x, z) => inRect(x, z, -120, 120, -88, -40) },
  { name: 'Civic Center · Cedar Ln', test: (x, z) => inRect(x, z, -120, 120, -200, -158) },
  { name: 'Main Street', test: (x, z) => inRect(x, z, -130, 130, -40, 22) },
  { name: 'Cascade Lumber Yard', test: (x, z) => inRect(x, z, -210, -130, 5, 75) },
  { name: "Bob's Used Cars", test: (x, z) => inRect(x, z, 130, 200, -66, -6) },
  { name: 'Tex Outpost', test: (x, z) => inRect(x, z, 200, 256, -52, -4) },
  { name: 'Substation 4', test: (x, z) => inRect(x, z, -360, -300, -285, -240) },
  { name: 'Miller Dairy', test: (x, z) => nearFarm(x, z, FARMS.dairy) },
  { name: 'Ridgeview Farm', test: (x, z) => nearFarm(x, z, FARMS.hay) },
  { name: 'Sunny Acres Orchard', test: (x, z) => nearFarm(x, z, FARMS.orchard) },
  { name: 'Hansen Farm', test: (x, z) => inRect(x, z, 255, 445, -160, 125) },
  { name: 'Spirit Lake', test: (x, z) => Math.hypot((x - 700) / 360, (z - 420) / 220) < 1 },
  { name: 'US-20 West', test: (x, z) => x < -130 && Math.abs(z) < 40 },
  { name: 'US-20 East', test: (x, z) => x > 130 && Math.abs(z) < 40 },
  { name: 'SR-9 North', test: (x, z) => z < -340 && Math.abs(x) < 40 },
  { name: 'SR-9 South', test: (x, z) => z > 340 && Math.abs(x) < 40 },
  { name: 'Pine Hollow', test: (x, z) => Math.hypot(x / 400, z / 340) < 1 },
];

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
    for (const r of this.world.map.roads) {
      if (r.x1 < px - range || r.x0 > px + range || r.z1 < pz - range || r.z0 > pz + range) continue;
      g.fillStyle = r.kind === 'dirt' ? '#b49a74' : r.kind === 'alley' ? '#8d9097' : '#d9dbdf';
      g.fillRect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0);
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

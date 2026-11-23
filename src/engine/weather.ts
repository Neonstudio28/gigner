import * as THREE from 'three';
import { PRESETS, type AtmoPreset } from './atmosphere';

const D2R = Math.PI / 180;
const LATITUDE = 47.5;

/** Sun bearing and elevation over the valley for a local solar time and declination (degrees). */
export function sunAt(hours: number, declination: number) {
  const phi = LATITUDE * D2R;
  const dec = declination * D2R;
  const H = (hours - 12) * 15 * D2R;
  const sinEl = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const el = Math.asin(THREE.MathUtils.clamp(sinEl, -1, 1));
  const az = Math.atan2(-Math.sin(H) * Math.cos(dec), (Math.sin(dec) - sinEl * Math.sin(phi)) / Math.cos(phi));
  return { azimuth: (((az / D2R) % 360) + 360) % 360, elevation: el / D2R };
}

const HEX = new Set(['tint', 'color', 'shadowTint', 'highTint']);
const mixHex = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Blends two looks field by field (colours in RGB; anything only one side defines is taken from it). */
function mix<T>(a: T, b: T, t: number, key = ''): T {
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (typeof a === 'number' && typeof b === 'number') return (HEX.has(key) ? mixHex(a, b, t) : a + (b - a) * t) as T;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => v + (b[i] - v) * t) as T;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out: Record<string, unknown> = {};
    const ra = a as Record<string, unknown>;
    const rb = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) out[k] = k in ra && k in rb ? mix(ra[k], rb[k], t, k) : (ra[k] ?? rb[k]);
    return out as T;
  }
  return t < 0.5 ? a : b;
}

export type SkyKind = 'clear' | 'mist' | 'overcast' | 'rain' | 'fog';
const LOOK: Record<SkyKind, string> = { clear: 'Clear Day', mist: 'PNW Mist', overcast: 'Overcast Drizzle', rain: 'Rain', fog: 'PNW Thick Fog' };
const RAIN: Record<SkyKind, number> = { clear: 0, mist: 0, overcast: 0.28, rain: 1, fog: 0 };
const LABEL: Record<SkyKind, string> = { clear: 'Clear', mist: 'Mist', overcast: 'Drizzle', rain: 'Rain', fog: 'Fog' };
/** What tends to follow what west of the Cascades: it is usually about to rain, raining, or just stopped. */
const NEXT: Record<SkyKind, [SkyKind, number][]> = {
  clear: [['mist', 0.4], ['overcast', 0.45], ['fog', 0.15]],
  mist: [['clear', 0.3], ['overcast', 0.4], ['fog', 0.15], ['rain', 0.15]],
  overcast: [['rain', 0.5], ['mist', 0.25], ['clear', 0.25]],
  rain: [['overcast', 0.45], ['mist', 0.3], ['clear', 0.25]],
  fog: [['mist', 0.55], ['clear', 0.25], ['overcast', 0.2]],
};
const preset = (name: string) => PRESETS.find((p) => p.name === name) ?? PRESETS[0];
const ss = THREE.MathUtils.smoothstep;

/**
 * The weather and the clock. Time runs through a full day (dawn fog, daylight, golden hour, dusk, a moonlit
 * night) while fronts drift through on their own schedule; every frame the two are blended into one look,
 * which the app applies exactly like a hand-picked preset. Rain, wet ground and lightning ride along.
 */
export class Weather {
  enabled = true;
  /** Local solar time, hours. */
  hour = 10;
  /** Game hours per real minute (1.2 puts a whole day in twenty minutes). */
  rate = 1.2;
  /** Solar declination: about +10 is late summer in the Northwest. */
  declination = 10;
  /** Seconds a front takes to arrive, and how long it stays. */
  blendTime = 35;
  from: SkyKind = 'mist';
  to: SkyKind = 'mist';
  /** 0..1 rain falling right now, 0..1 how wet the ground is, and the current lightning flash. */
  rain = 0;
  wet = 0.5;
  flash = 0;
  night = 0;
  wind = new THREE.Vector2(2.5, 1);
  /** Called when lightning strikes, with the seconds until the thunder arrives. */
  onThunder: ((delay: number) => void) | null = null;
  private t = 1;
  private hold = 40;
  private strike = 0;
  private gust = 0;

  /** Brings in a front now (from the settings panel or a script). */
  set(kind: SkyKind, instant = false) {
    this.from = instant ? kind : this.t < 0.5 ? this.from : this.to;
    this.to = kind;
    this.t = instant ? 1 : 0;
    this.hold = 70 + Math.random() * 70;
    if (instant) {
      this.rain = RAIN[kind];
      this.wet = Math.max(preset(LOOK[kind]).wet, this.rain > 0 ? 0.95 : 0);
    }
  }

  get label() {
    const kind = this.t < 0.5 ? this.from : this.to;
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    const name = kind === 'rain' && this.rain > 0.85 && this.strike > 0 ? 'Thunderstorm' : this.night > 0.6 && kind === 'clear' ? 'Clear night' : LABEL[kind];
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}  ${name}`;
  }

  update(dt: number): AtmoPreset {
    this.hour = (this.hour + (dt * this.rate) / 60) % 24;
    // fronts
    if (this.t < 1) this.t = Math.min(1, this.t + dt / this.blendTime);
    else if ((this.hold -= dt) <= 0) {
      let r = Math.random();
      let pick = NEXT[this.to][0][0];
      for (const [k, w] of NEXT[this.to]) {
        if ((r -= w) <= 0) {
          pick = k;
          break;
        }
      }
      this.set(pick);
    }
    const e = this.t * this.t * (3 - 2 * this.t);
    const day = mix(preset(LOOK[this.from]), preset(LOOK[this.to]), e);
    const rainT = RAIN[this.from] + (RAIN[this.to] - RAIN[this.from]) * e;
    this.rain += (rainT - this.rain) * Math.min(1, dt / 5);
    // ground soaks quickly and dries slowly, never drier than the air leaves it
    this.wet = THREE.MathUtils.clamp(this.wet + (this.rain > 0.05 ? dt * 0.05 * (0.4 + this.rain) : -dt * 0.006), day.wet * 0.7, 1);
    this.gust += dt;
    const blow = 2 + 7 * this.rain + 1.5 * Math.sin(this.gust * 0.21) + Math.sin(this.gust * 0.53);
    this.wind.set(blow * 0.9, blow * 0.42);

    // time of day
    const sun = sunAt(this.hour, this.declination);
    const el = sun.elevation;
    const am = this.hour < 12;
    const night = ss(-el, 4, 9.5);
    const dusk = ss(-el, -8, -1) * (1 - night);
    const clear = 1 - 0.8 * ss(day.clouds.coverage, 0.6, 0.95);
    const low = ss(-el, -(am ? 20 : 24), -9) * (1 - dusk) * (1 - night) * clear;
    this.night = night;
    let p = mix(day, preset(am ? 'Morning Fog' : 'Golden Hour'), low);
    p = mix(p, preset('Dusk'), dusk + night);
    p = mix(p, preset('Night'), night);
    p = structuredClone(p); // the mixes hand back a preset itself at either end; never edit those
    // the weather keeps its own sky, fog and damp whatever the hour
    const keep = 0.65 * (dusk + night);
    p.clouds.coverage += (day.clouds.coverage - p.clouds.coverage) * keep;
    p.clouds.density += (day.clouds.density - p.clouds.density) * keep;
    p.fog.density += (Math.max(p.fog.density, day.fog.density) - p.fog.density) * keep;
    if (p.volume.density !== undefined && day.volume.density !== undefined) p.volume.density += (Math.max(p.volume.density, day.volume.density) - p.volume.density) * keep;
    p.wet = this.wet;
    p.windows = Math.max(p.windows, 0.55 * this.rain);
    // one light serves as sun and moon; it changes places while it is dark below the horizon
    if (el > -4.5) {
      p.sun.azimuth = sun.azimuth;
      // twilight: the sky keeps glowing from just over the horizon after the disc has gone
      p.sun.elevation = Math.max(1.5, el);
      p.sun.intensity *= ss(el, -4.5, -1.5);
    } else {
      const moon = preset('Night').sun;
      p.sun.azimuth = moon.azimuth + (((this.hour + 12) % 24) - 12) * 6;
      p.sun.elevation = moon.elevation;
      p.sun.tint = moon.tint;
      p.sun.intensity = Math.max(p.sun.intensity, 0.9) * ss(-el, 4.5, 6.5);
    }
    p.volume.lampsOn = Math.max(ss(-el, -6, 2), Math.min(1, p.windows * 1.3));

    // lightning in heavy rain: a double flash, thunder a few seconds behind
    this.flash *= Math.exp(-dt * 9);
    if (this.strike > 0) {
      this.strike -= dt;
      if (this.strike <= 0) this.flash = 0.8;
    } else if (this.rain > 0.85 && Math.random() < dt * 0.045) {
      this.flash = 1;
      this.strike = 0.12 + Math.random() * 0.1;
      this.onThunder?.(1 + Math.random() * 4);
    }
    p.name = 'Dynamic';
    return p;
  }
}

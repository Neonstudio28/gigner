import type { Placer } from './placer';
import { Rng } from '../core/rng';
import { barricade, barrel, cone } from '../props';
import type { Kit } from '../core/kit';

/**
 * Where a road runs out at the edge of the valley it does not just stop in the grass: the way out of Pine Hollow
 * is closed by a slide — a ROAD CLOSED line of barricades and barrels, then earth, boulders and downed timber
 * across the roadway, with the forest closing in behind it.
 */
const THROUGH = new Set(['I-90', 'Old Hwy 10 W', 'Old Hwy 10 E']);

/**
 * The through roads leave the valley by tunnel: a concrete portal under a wooded ridge. Traffic drives into
 * the dark and is gone, which is exactly where the simulation recycles it. Local frame: +Z heads out of the map.
 */
function portal(k: Kit, rng: Rng, hw: number, divided: boolean) {
  const CONC = 0xb9b4a8;
  const zf = -9;
  const half = hw + 0.4;
  const H = 6.4;
  const W = half * 2 + 9;
  const bores: [number, number][] = divided ? [[-half, -0.9], [0.9, half]] : [[-half, half]];
  // headwall: piers, lintel, coping
  let cur = -W / 2;
  for (const [a, b] of [...bores, [W / 2, W / 2]]) {
    if (a - cur > 0.05) {
      k.box((cur + a) / 2, 0, zf, a - cur, H + 3.2, 1.4, CONC, 'concrete');
      k.solid((cur + a) / 2, zf, a - cur, 1.4);
    }
    cur = b;
  }
  k.box(0, H, zf, W, 3.2, 1.4, CONC, 'concrete');
  k.box(0, H + 3.2, zf, W + 0.8, 0.5, 2.0, 0xa39e92, 'concrete');
  k.box(0, H, zf + 4.2, W, 3.0, 7, CONC, 'concrete');
  for (const s of [-1, 1]) k.box(s * (W / 2 - 0.7), 0, zf + 4.2, 1.4, H, 7, CONC, 'concrete');
  k.box(0, H - 0.5, zf - 0.72, W - 1, 0.4, 0.06, 0xe8c229);
  for (const [a, b] of bores) {
    const cx = (a + b) / 2;
    const bw = b - a;
    // haunches round off the opening; inside it is dark after a few lamps
    for (const s of [-1, 1]) k.box(cx + s * (bw / 2 - 0.5), H - 1.0, zf, 1.6, 1.6, 1.38, CONC, 'concrete', { rz: Math.PI / 4 });
    k.box(cx, 0, zf + 1.9, bw, H, 0.1, 0x040506, 'paint', { cast: false });
    for (const s of [-1, 1]) k.box(cx + s * (bw / 2 - 0.05), 0, zf + 1.2, 0.1, H, 1.6, 0x1c1d1f, 'paint', { cast: false });
    k.box(cx, H - 0.1, zf + 1.2, bw, 0.1, 1.6, 0x1c1d1f, 'paint', { cast: false });
    for (let i = 0; i < Math.max(2, Math.round(bw / 3.5)); i++) k.box(a + ((i + 0.5) * bw) / Math.max(2, Math.round(bw / 3.5)), H - 0.22, zf + 0.9, 0.9, 0.08, 0.3, 0xffd9a0, 'light', { cast: false });
  }
  // the ridge over the tunnel, and the firs on it
  const lumps: [number, number, number, number, number][] = [];
  const GRASS = [0x4f7a36, 0x4a7234, 0x457031, 0x56803a];
  const lump = (x: number, z: number, r: number, sy: number, y: number) => {
    lumps.push([x, z, r, sy, y]);
    k.ico(x, y, z, r, 1, rng.pick(GRASS), 'paint', 1.15, sy, 1);
  };
  for (let i = 0; i < 16; i++) {
    const r = rng.range(15, 25);
    lump(rng.range(-W / 2 - 16, W / 2 + 16), zf + 2.4 + r + rng.range(0, 24), r, rng.range(0.7, 1.0), rng.range(-1, 4));
  }
  // shoulders of the hill come forward round both sides of the headwall
  for (const s of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const r = rng.range(9, 15);
      lump(s * (W / 2 + r * rng.range(0.75, 1.5)), zf + r * rng.range(0.5, 1.1), r, rng.range(0.75, 1.05), rng.range(-2, 2));
    }
  const top = (x: number, z: number) => Math.max(0, ...lumps.map(([lx, lz, r, sy, y]) => y + sy * Math.sqrt(Math.max(0, r * r - ((x - lx) / 1.15) ** 2 - (z - lz) ** 2))));
  for (let i = 0; i < 60; i++) {
    const x = rng.range(-W / 2 - 26, W / 2 + 26);
    const z = zf + rng.range(-6, 44);
    if (Math.abs(x) < W / 2 + 1 && z < zf + 8) continue;
    const y = top(x, z) - 0.4;
    if (y < 2) continue;
    const h = rng.range(7, 13);
    k.cyl(x, y, z, 0.12, 0.26, h * 0.3, 5, 0x5d4632);
    for (let j = 0; j < 3; j++) k.cone(x, y + h * (0.2 + j * 0.24), z, h * (0.24 - j * 0.055), h * 0.42, 6, [0x2f5134, 0x35593a, 0x2a4a30][j]);
  }
  k.solid(0, zf + 24, W + 36, 44);
  for (const s of [-1, 1]) k.solid(s * (W / 2 + 12), zf + 4, 22, 14);
}

export function roadEnds(pl: Placer) {
  const { c, k, net } = pl;
  const rng = new Rng(4242);
  for (const r of net.roads) {
    if (r.pts.length < 4 || r.spec.rank < 3) continue;
    for (const last of [false, true]) {
      const p = r.pts[last ? r.pts.length - 1 : 0];
      if (Math.hypot(p.x, p.z) < 1750) continue;
      const ox = last ? p.tx : -p.tx;
      const oz = last ? p.tz : -p.tz;
      // only roads that actually head out of the valley
      if (ox * p.x + oz * p.z < 0) continue;
      const hw = r.spec.hw + (r.spec.shoulder?.w ?? 0);
      if (THROUGH.has(r.def.name ?? '')) {
        k.at(p.x, p.z, Math.atan2(ox, oz), () => portal(k, rng, r.spec.hw, r.kind === 'interstate'), p.y);
        continue;
      }
      k.at(
        p.x,
        p.z,
        Math.atan2(ox, oz),
        () => {
          // closure line, facing the traffic coming up the road
          const n = Math.max(1, Math.round((hw * 2) / 5.2));
          for (let i = 0; i < n; i++) barricade(k, c.signs, -hw + ((i + 0.5) * hw * 2) / n, -26, Math.PI);
          for (let i = 0; i < 7; i++) {
            const t = i / 6;
            barrel(k, -hw + 0.5 + t * (hw - 0.8), -62 + t * 30, 0xe8742a);
            if (i % 2 === 0) cone(k, hw - 0.6, -60 + t * 30);
          }
          for (const s of [-1, 1]) {
            k.box(s * (hw + 1.4), 0, -40, 0.1, 2.3, 0.1, 0x8a8e92, 'metal');
            k.sign(s * (hw + 1.4), 1.7, -40, 1.5, 0.5, c.signs.get('roadClosed'), { ry: Math.PI, back: 0xffffff, thick: 0.04 });
            k.box(s * (hw + 1.4), 1.45, -40.03, 1.0, 0.22, 0.03, 0xe8742a);
          }
          // the slide: earth fans across the road, boulders ride on it, snapped firs lie in it
          const earth = [0x6f5d47, 0x7c6a52, 0x64543f, 0x857560];
          for (let i = 0; i < 16; i++) {
            const x = rng.range(-hw - 9, hw + 9);
            const z = rng.range(-9, 20);
            const rad = rng.range(3.2, 6.5) * (1 - Math.abs(x) / (hw + 22));
            k.ico(x, rng.range(-0.8, 0.4) + Math.max(0, z) * 0.12, z, rad, 1, rng.pick(earth), 'paint', 1.25, rng.range(0.4, 0.7), 1.1);
          }
          for (let i = 0; i < 26; i++) {
            const x = rng.range(-hw - 8, hw + 8);
            const z = rng.range(-14, 14);
            const rad = rng.range(0.35, 1.7);
            k.ico(x, Math.max(0, 1.4 - Math.abs(z + 2) * 0.13) + rad * 0.2, z, rad, 0, rng.pick([0x8a8a84, 0x77766f, 0x9a978d, 0x6a6964]), 'paint', 1, rng.range(0.6, 0.9), rng.range(0.8, 1.2));
          }
          for (let i = 0; i < 6; i++) {
            const x = rng.range(-hw - 4, hw + 4);
            const z = rng.range(-7, 9);
            const len = rng.range(6, 12);
            const ry = rng.range(-0.6, 0.6) + (i % 2 ? Math.PI / 2 : 0);
            k.cyl(x, 1.2 + rng.range(0, 0.9), z, 0.16, 0.3, len, 7, 0x5d4632, 'paint', { rz: Math.PI / 2 + rng.range(-0.18, 0.18), ry });
          }
          k.solid(0, 4, hw * 2 + 18, 22);
        },
        p.y,
      );
      // nothing grows on the fresh slide, but the firs crowd in right behind it
      for (let i = 0; i < 46; i++) {
        const d = rng.range(18, 60);
        const lat = rng.range(-hw - 34, hw + 34);
        pl.trees.push({ x: p.x + ox * d - oz * lat, z: p.z + oz * d + ox * lat, kind: rng.chance(0.75) ? 'fir' : 'pine', s: rng.range(0.9, 1.5) });
      }
    }
  }
}

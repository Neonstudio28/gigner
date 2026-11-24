/** The walkable world as the townsfolk see it: a lazily filled grid with the same rules the player walks by. */
export interface NavWorld {
  groundAt: (x: number, z: number, nearY?: number) => number;
  floorAt: (x: number, z: number, y?: number) => { floor: number; ceil?: number } | null;
  solidAt: (x: number, z: number, y?: number) => boolean;
  waterAt: (x: number, z: number) => { y: number } | null;
  roadAt: (x: number, z: number, nearY?: number) => unknown | null;
}
export interface P3 {
  x: number;
  y: number;
  z: number;
}

export const CELL = 0.4;
const STEP = 0.62;
const DROP = 0.5;
const RADIUS = 0.3;
const RING = [0, 1, 2, 3, 4, 5].map((i) => [Math.cos((i * Math.PI) / 3) * RADIUS, Math.sin((i * Math.PI) / 3) * RADIUS]);
const LOW = [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]];

interface Entry {
  yq: number;
  /** Floor height, or NaN where nobody can stand. */
  f: number;
  road: boolean;
}

export class WalkGrid {
  private cells = new Map<number, Entry[]>();
  /** Probes made (for the per-frame budget). */
  work = 0;
  constructor(readonly w: NavWorld) {}

  /** Floor a walker at height y would stand on at (x, z), or NaN when it is blocked, too steep or under water. */
  probe(x: number, z: number, y: number): Entry {
    this.work++;
    const w = this.w;
    const zn = w.floorAt(x, z, y + STEP);
    const f = Math.max(w.groundAt(x, z, y + STEP), zn ? zn.floor : -1e9);
    const e: Entry = { yq: y, f, road: false };
    if (f - y > STEP || y - f > DROP) e.f = NaN;
    else {
      const wt = w.waterAt(x, z);
      if (wt && wt.y - f > 0.12) e.f = NaN;
      else if (w.solidAt(x, z, f + 0.9) || w.solidAt(x, z, f + 0.45)) e.f = NaN;
      else {
        for (const [dx, dz] of RING) if (w.solidAt(x + dx, z + dz, f + 0.9)) e.f = NaN;
        if (!Number.isNaN(e.f)) for (const [dx, dz] of LOW) if (w.solidAt(x + dx, z + dz, f + 0.45)) e.f = NaN;
      }
    }
    if (!Number.isNaN(e.f)) e.road = !!w.roadAt(x, z, f);
    return e;
  }

  /** Cached probe of a grid cell. */
  cell(ix: number, iz: number, y: number): Entry {
    const key = (ix + 32768) * 65536 + (iz + 32768);
    let list = this.cells.get(key);
    if (list) {
      for (const e of list) {
        if (Number.isNaN(e.f) ? Math.abs(e.yq - y) < 0.25 : e.f <= y + STEP && e.f >= y - DROP) return e;
      }
    } else this.cells.set(key, (list = []));
    const e = this.probe(ix * CELL, iz * CELL, y);
    list.push(e);
    return e;
  }

  /** Floor under a free point, or NaN. */
  floor(x: number, z: number, y: number) {
    return this.probe(x, z, y).f;
  }

  /** True when the straight walk from a to b is clear (every 0.3 m is standable, each step from the one before). */
  straight(a: P3, b: P3, endTol = 0.7): boolean {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(d / 0.3));
    let y = a.y;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const f = this.cell(Math.round((a.x + (b.x - a.x) * t) / CELL), Math.round((a.z + (b.z - a.z) * t) / CELL), y).f;
      if (Number.isNaN(f)) return false;
      y = f;
    }
    return Math.abs(y - b.y) < endTol;
  }

  /** True when the stretch from a to b runs over a carriageway. */
  crosses(a: P3, b: P3): boolean {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(d / 0.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = a.y + (b.y - a.y) * t;
      if (this.w.roadAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, y)) return true;
    }
    return false;
  }

  /**
   * Shortest walk from a to b inside a box around them (A* over the cells, then pulled taut).
   * Returns the corner points from a to b, or null when there is no way within `pad` metres of the pair.
   */
  plan(a: P3, b: P3, pad = 9, goalR = 0.5): P3[] | null {
    if (this.straight(a, b)) return [a, b];
    const x0 = Math.floor((Math.min(a.x, b.x) - pad) / CELL);
    const z0 = Math.floor((Math.min(a.z, b.z) - pad) / CELL);
    const W = Math.ceil((Math.max(a.x, b.x) + pad) / CELL) - x0 + 1;
    const H = Math.ceil((Math.max(a.z, b.z) + pad) / CELL) - z0 + 1;
    if (W * H > 220000) return null;
    const N = W * H;
    const g = new Float32Array(N).fill(Infinity);
    const fy = new Float32Array(N);
    const from = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const sx = Math.round(a.x / CELL) - x0;
    const sz = Math.round(a.z / CELL) - z0;
    const gx = Math.round(b.x / CELL) - x0;
    const gz = Math.round(b.z / CELL) - z0;
    const start = sz * W + sx;
    g[start] = 0;
    fy[start] = a.y;
    const heap: number[] = [start];
    const pri = new Float32Array(N);
    const h = (i: number) => {
      const dx = Math.abs((i % W) - gx);
      const dz = Math.abs(Math.floor(i / W) - gz);
      return (Math.max(dx, dz) + 0.414 * Math.min(dx, dz)) * CELL;
    };
    pri[start] = h(start);
    const push = (i: number) => {
      let c = heap.push(i) - 1;
      while (c > 0) {
        const p = (c - 1) >> 1;
        if (pri[heap[p]] <= pri[heap[c]]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = c * 2 + 1;
          const r = l + 1;
          let m = c;
          if (l < heap.length && pri[heap[l]] < pri[heap[m]]) m = l;
          if (r < heap.length && pri[heap[r]] < pri[heap[m]]) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]];
          c = m;
        }
      }
      return top;
    };
    const gr = Math.ceil(goalR / CELL);
    let goal = -1;
    while (heap.length) {
      const cur = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W;
      const cz = (cur - cx) / W;
      if (Math.abs(cx - gx) <= gr && Math.abs(cz - gz) <= gr && Math.abs(fy[cur] - b.y) < 0.7 && Math.hypot(cx - gx, cz - gz) * CELL <= goalR + 0.01) {
        goal = cur;
        break;
      }
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
          const ni = nz * W + nx;
          if (closed[ni]) continue;
          const e = this.cell(nx + x0, nz + z0, fy[cur]);
          if (Number.isNaN(e.f)) continue;
          // no cutting corners round an obstacle
          if (dx && dz && (Number.isNaN(this.cell(cx + dx + x0, cz + z0, fy[cur]).f) || Number.isNaN(this.cell(cx + x0, cz + dz + z0, fy[cur]).f))) continue;
          const cost = g[cur] + (dx && dz ? 1.414 : 1) * CELL * (e.road ? 3 : 1);
          if (cost >= g[ni]) continue;
          g[ni] = cost;
          fy[ni] = e.f;
          from[ni] = cur;
          pri[ni] = cost + h(ni);
          push(ni);
        }
      }
    }
    if (goal < 0) return null;
    const raw: P3[] = [];
    for (let i = goal; i >= 0; i = from[i]) raw.push({ x: ((i % W) + x0) * CELL, z: (Math.floor(i / W) + z0) * CELL, y: fy[i] });
    raw.reverse();
    raw[0] = a;
    const tail = raw[raw.length - 1];
    if (this.straight(tail, b)) raw.push(b);
    // pull the stair-stepped cell path taut
    const out: P3[] = [raw[0]];
    let i = 0;
    while (i < raw.length - 1) {
      let j = Math.min(raw.length - 1, i + 40);
      while (j > i + 1 && !this.straight(raw[i], raw[j], 0.3)) j--;
      out.push(raw[j]);
      i = j;
    }
    return out;
  }
}

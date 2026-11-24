import type { RoadNetwork } from '../world/roads/network';
import { WalkGrid, type NavWorld, type P3 } from './grid';

export interface NavNode extends P3 {
  id: number;
  lane: number;
  edges: NavEdge[];
  comp: number;
  /** Out on a carriageway (where a sidewalk line runs through a junction): walked over, never stopped on. */
  road: boolean;
}
export interface NavEdge {
  to: number;
  cost: number;
  /** The stretch runs over a carriageway: look before stepping out. */
  cross: boolean;
  /** Corner points between the two nodes when the way is not straight. */
  via?: P3[];
}
/** A point on a route; `cross` marks the start of a stretch over a carriageway. */
export interface RoutePt extends P3 {
  cross?: boolean;
}
interface Access {
  node: number;
  /** From the node to the place. */
  pts: P3[];
  len: number;
}

const dist = (a: P3, b: P3) => Math.hypot(a.x - b.x, a.z - b.z);
const HASH = 6;

/** Sidewalk graph over the whole town plus cached approaches to every place people go. */
export class Nav {
  readonly grid: WalkGrid;
  readonly nodes: NavNode[] = [];
  private hash = new Map<number, number[]>();
  private access = new Map<string, Access | null>();
  private main = 0;
  /** Probes allowed per frame for planning (reset by tick). */
  budget = 2500;
  stats = { nodes: 0, edges: 0, crossings: 0, detours: 0, dropped: 0, ms: 0 };

  constructor(world: NavWorld, net: RoadNetwork, radius = 560) {
    this.grid = new WalkGrid(world);
    const t0 = performance.now();
    const g = this.grid;
    let lane = 0;
    for (const r of net.roads) {
      const sp = r.spec;
      if (r.kind === 'interstate' || r.kind === 'ramp') continue;
      const off = sp.curb ? sp.hw + 0.25 + sp.park + sp.walk * 0.5 : sp.hw + (sp.shoulder?.w ?? 0) + 0.6;
      for (const side of [false, true]) {
        lane++;
        const raw = net.lane(r, off, side);
        // resample every 5 m
        const pts: (P3 & { nx: number; nz: number })[] = [];
        let acc = 5;
        for (let i = 1; i < raw.length; i++) {
          const a = raw[i - 1];
          const b = raw[i];
          const d = Math.hypot(b.x - a.x, b.z - a.z);
          if (d < 1e-4) continue;
          while (acc <= d) {
            const t = acc / d;
            pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, nx: -(b.z - a.z) / d, nz: (b.x - a.x) / d });
            acc += 5;
          }
          acc -= d;
        }
        let prev: NavNode | null = null;
        let gap = 0;
        for (const p of pts) {
          if (Math.hypot(p.x, p.z) > radius) {
            prev = null;
            continue;
          }
          let node: NavNode | null = null;
          for (const k of [0, 0.6, -0.6, 1.2, -1.2]) {
            const x = p.x + p.nx * k;
            const z = p.z + p.nz * k;
            const f = g.floor(x, z, p.y + 0.3);
            if (!Number.isNaN(f)) {
              node = this.add(x, f, z, lane);
              break;
            }
          }
          if (!node) {
            this.stats.dropped++;
            gap++;
            continue;
          }
          if (prev && gap < 5) this.link(prev, node, gap ? 6 : 4);
          prev = node;
          gap = 0;
        }
      }
    }
    // where two sidewalks meet (corners), and where one ends at another road
    const ends = new Set<number>();
    for (const n of this.nodes) {
      if (n.edges.filter((e) => this.nodes[e.to].lane === n.lane).length < 2) ends.add(n.id);
      for (const o of this.near(n.x, n.z, 3.5)) if (o.id > n.id && o.lane !== n.lane && Math.abs(o.y - n.y) < 1 && dist(n, o) < 3.5) this.link(n, o, 0);
    }
    for (const id of ends) {
      const n = this.nodes[id];
      if (n.edges.some((e) => this.nodes[e.to].lane !== n.lane)) continue;
      const c = this.near(n.x, n.z, 18)
        .filter((o) => o.lane !== n.lane && Math.abs(o.y - n.y) < 1.5)
        .sort((a, b) => dist(a, n) - dist(b, n));
      for (const o of c.slice(0, 3)) if (this.link(n, o, 5)) break;
    }
    // the connected town; islands (a stub cut off by a fence) are never routed to
    let best = 0;
    let comp = 0;
    for (const n of this.nodes) {
      if (n.comp) continue;
      comp++;
      let size = 0;
      const q = [n];
      n.comp = comp;
      while (q.length) {
        const c = q.pop()!;
        size++;
        for (const e of c.edges) {
          const o = this.nodes[e.to];
          if (!o.comp) {
            o.comp = comp;
            q.push(o);
          }
        }
      }
      if (size > best) {
        best = size;
        this.main = comp;
      }
    }
    this.stats.nodes = best;
    this.stats.ms = Math.round(performance.now() - t0);
  }

  private add(x: number, y: number, z: number, lane: number): NavNode {
    const n: NavNode = { id: this.nodes.length, x, y, z, lane, edges: [], comp: 0, road: !!this.grid.w.roadAt(x, z, y) };
    this.nodes.push(n);
    const key = Math.floor(x / HASH) * 4096 + Math.floor(z / HASH);
    const cell = this.hash.get(key);
    if (cell) cell.push(n.id);
    else this.hash.set(key, [n.id]);
    return n;
  }

  /** Nodes within r of a point. */
  near(x: number, z: number, r: number): NavNode[] {
    const out: NavNode[] = [];
    const x0 = Math.floor((x - r) / HASH);
    const x1 = Math.floor((x + r) / HASH);
    const z0 = Math.floor((z - r) / HASH);
    const z1 = Math.floor((z + r) / HASH);
    for (let i = x0; i <= x1; i++) {
      for (let j = z0; j <= z1; j++) {
        const cell = this.hash.get(i * 4096 + j);
        if (cell) for (const id of cell) if (Math.hypot(this.nodes[id].x - x, this.nodes[id].z - z) <= r) out.push(this.nodes[id]);
      }
    }
    return out;
  }

  /** Joins two nodes by a straight walk, or by a detour found within `pad` metres (0: straight only). */
  private link(a: NavNode, b: NavNode, pad: number): boolean {
    if (a.edges.some((e) => e.to === b.id)) return true;
    let via: P3[] | undefined;
    if (!this.grid.straight(a, b)) {
      if (!pad) return false;
      const p = this.grid.plan(a, b, pad, 0.45);
      if (!p || dist(p[p.length - 1], b) > 0.9) return false;
      via = p.slice(1, -1);
      if (dist(p[p.length - 1], b) > 0.05) via.push(p[p.length - 1]);
      this.stats.detours++;
    }
    const chain = [a, ...(via ?? []), b];
    let cost = 0;
    let cross = false;
    for (let i = 1; i < chain.length; i++) {
      cost += dist(chain[i - 1], chain[i]);
      cross ||= this.grid.crosses(chain[i - 1], chain[i]);
    }
    if (cross) {
      cost = cost * 1.5 + 6;
      this.stats.crossings++;
    }
    a.edges.push({ to: b.id, cost, cross, via });
    b.edges.push({ to: a.id, cost, cross, via: via ? [...via].reverse() : undefined });
    this.stats.edges++;
    return true;
  }

  tick() {
    this.grid.work = 0;
  }
  get busy() {
    return this.grid.work > this.budget;
  }

  /** How to walk between the sidewalk and a place off it (cached; null when the place cannot be reached). */
  private reach(p: P3): Access | null {
    const key = `${Math.round(p.x * 10)},${Math.round(p.y * 4)},${Math.round(p.z * 10)}`;
    const hit = this.access.get(key);
    if (hit !== undefined) return hit;
    let res: Access | null = null;
    let c: NavNode[] = [];
    for (const r of [45, 120]) {
      c = this.near(p.x, p.z, r).filter((n) => n.comp === this.main && Math.abs(n.y - p.y) < 8);
      if (c.length) break;
    }
    c.sort((a, b) => dist(a, p) - dist(b, p));
    const tried = new Set<number>();
    for (const n of c) {
      // one candidate per lane, nearest first
      if (tried.has(n.lane) || tried.size >= 4) continue;
      tried.add(n.lane);
      const pts = this.grid.plan(n, p, 8, 0.45);
      if (!pts || dist(pts[pts.length - 1], p) > 0.9) continue;
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
      if (!res || len < res.len) res = { node: n.id, pts, len };
      if (res.len < dist(n, p) * 1.4 + 2) break;
    }
    this.access.set(key, res);
    return res;
  }

  /** True when a place can be walked to from the sidewalks. */
  reachable(p: P3) {
    return !!this.reach(p);
  }

  /**
   * The walk from a to b: off the place onto the sidewalk, along the graph, and off again.
   * Returns null when there is no way, or 'later' when this frame's planning budget is spent.
   */
  route(a: P3, b: P3): RoutePt[] | null | 'later' {
    if (this.busy) return 'later';
    const d = dist(a, b);
    if (d < 0.3) return [a, b];
    if (d < 22 && Math.abs(a.y - b.y) < 4) {
      const direct = this.grid.plan(a, b, 7, 0.45);
      if (direct) return this.flag(direct);
    }
    const A = this.reach(a);
    const B = this.reach(b);
    if (!A || !B) return null;
    const mid = this.search(A.node, B.node);
    if (!mid) return null;
    const out: P3[] = [...A.pts].reverse();
    for (const p of mid) out.push(p);
    for (const p of B.pts.slice(1)) out.push(p);
    const clean: P3[] = [out[0]];
    for (let i = 1; i < out.length; i++) if (dist(out[i], clean[clean.length - 1]) > 0.05) clean.push(out[i]);
    return this.flag(clean);
  }

  /** Marks the points whose next stretch runs over a carriageway. */
  private flag(pts: P3[]): RoutePt[] {
    const out: RoutePt[] = pts.map((p) => ({ x: p.x, y: p.y, z: p.z }));
    for (let i = 0; i < out.length - 1; i++) out[i].cross = this.grid.crosses(out[i], out[i + 1]);
    return out;
  }

  /** A* over the sidewalk graph: the points after the start node, up to and including the goal node. */
  private search(from: number, to: number): P3[] | null {
    if (from === to) return [];
    const N = this.nodes.length;
    const g = new Float32Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const by = new Array<NavEdge | undefined>(N);
    const done = new Uint8Array(N);
    const goal = this.nodes[to];
    const open: [number, number][] = [[dist(this.nodes[from], goal), from]];
    g[from] = 0;
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const cur = open[bi][1];
      open[bi] = open[open.length - 1];
      open.pop();
      if (done[cur]) continue;
      done[cur] = 1;
      if (cur === to) break;
      for (const e of this.nodes[cur].edges) {
        const c = g[cur] + e.cost;
        if (c < g[e.to]) {
          g[e.to] = c;
          prev[e.to] = cur;
          by[e.to] = e;
          open.push([c + dist(this.nodes[e.to], goal), e.to]);
        }
      }
    }
    if (prev[to] < 0) return null;
    const chain: number[] = [];
    for (let i = to; i !== from; i = prev[i]) chain.push(i);
    chain.reverse();
    const out: P3[] = [];
    for (const id of chain) {
      const e = by[id]!;
      if (e.via) for (const p of e.via) out.push(p);
      out.push(this.nodes[id]);
    }
    return out;
  }

  /** A random sidewalk node within r of a point (for strolls), or null. */
  wander(x: number, z: number, r: number, pick: () => number): NavNode | null {
    const c = this.near(x, z, r).filter((n) => n.comp === this.main && !n.road);
    return c.length ? c[Math.floor(pick() * c.length)] : null;
  }
}

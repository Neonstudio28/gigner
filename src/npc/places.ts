import type { Doorway, Zone } from '../world/buildings/interiors';
import type { Post } from './posts';
import type { Nav } from './nav';
import type { P3 } from './grid';

export type PlaceKind = 'home' | 'food' | 'shop' | 'civic' | 'work' | 'farm' | 'lodging' | 'bar' | 'church' | 'park' | 'beach' | 'pier' | 'play' | 'street';
export interface Site {
  id: string;
  name: string;
  x: number;
  z: number;
  ry: number;
  w: number;
  d: number;
}
/** Somewhere to stand or sit. */
export interface Spot extends P3 {
  ry?: number;
  seat: boolean;
  /** Where to step off from before sitting down. */
  ax?: number;
  az?: number;
  /** Agent standing here, or -1. */
  by: number;
  /** People who gather here stand in the same ring. */
  ring?: number;
  /** Indoor spots: the walk from the door (found on first use; null when there is none). */
  path?: P3[] | null;
  indoor: boolean;
  post?: Post;
}
export interface Place {
  id: number;
  def: string;
  kind: PlaceKind;
  name: string;
  x: number;
  z: number;
  /** Just outside and just inside the front door. */
  out: P3 | null;
  inn: P3 | null;
  /** The walk through the door, from outside to inside. */
  door: P3[];
  /** Standing room inside, and the spots by the door or about the yard. */
  spots: Spot[];
  yard: Spot[];
  /** Opening hours (people with business here come between these). */
  open: [number, number];
  here: number;
}

const KIND: [RegExp, PlaceKind, [number, number]][] = [
  [/^house_/, 'home', [0, 24]],
  [/^(diner|donut|bakery|lakeCafe)$/, 'food', [6, 21]],
  [/^tavern$/, 'bar', [15, 26]],
  [/^(hardware|pharmacy|pawn|barber|records|thrift|liquor|laundry|antiques|video|grocery|baitShop|gas)$/, 'shop', [8, 20]],
  [/^church$/, 'church', [7, 20]],
  [/^(townhall|courthouse|sheriff|bank|gazette|insurance)$/, 'civic', [8.5, 17.5]],
  [/^(barn|machineShed)$/, 'farm', [5.5, 19]],
  [/^(sawmill|warehouse|factory|lumberOffice)$/, 'work', [7, 17.5]],
  [/^motel$/, 'lodging', [0, 24]],
];
const OUTDOOR: Record<string, [PlaceKind, string]> = {
  beach: ['beach', 'the beach'],
  pier: ['pier', 'the pier'],
  play: ['play', 'the playground'],
  green: ['park', 'the green'],
  street: ['street', 'Main Street'],
};

const local = (s: Site, x: number, z: number): [number, number] => {
  const dx = x - s.x;
  const dz = z - s.z;
  const c = Math.cos(s.ry);
  const sn = Math.sin(s.ry);
  return [dx * c - dz * sn, dx * sn + dz * c];
};

/** Everywhere the townsfolk go: each building with its door and standing room, and the outdoor haunts. */
export function buildPlaces(nav: Nav, sites: Site[], doors: Doorway[], rooms: Zone[], posts: Post[], rand: () => number): Place[] {
  const g = nav.grid;
  const out: Place[] = [];
  const bySite = new Map<number, Place>();
  sites.forEach((s, si) => {
    const k = KIND.find(([re]) => re.test(s.id));
    if (!k) return;
    const p: Place = { id: out.length, def: s.id, kind: k[1], name: s.name, x: s.x, z: s.z, out: null, inn: null, door: [], spots: [], yard: [], open: k[2], here: 0 };
    // the front door: the reachable doorway farthest toward the street
    const mine = doors
      .map((d) => ({ d, l: local(s, d.x, d.z) }))
      .filter(({ l }) => Math.abs(l[0]) < s.w / 2 + 1 && Math.abs(l[1]) < s.d / 2 + 1)
      .sort((a, b) => b.l[1] - a.l[1]);
    for (const { d } of mine) {
      const iy = g.floor(d.x - d.nx * 1.1, d.z - d.nz * 1.1, d.y);
      if (Number.isNaN(iy)) continue;
      const inn = { x: d.x - d.nx * 1.1, z: d.z - d.nz * 1.1, y: iy };
      const far = { x: d.x + d.nx * 3, z: d.z + d.nz * 3, y: d.y - 0.5 };
      far.y = nav.grid.w.groundAt(far.x, far.z, d.y + 0.5);
      const way = g.plan(inn, far, 4, 1.6);
      if (!way) continue;
      const o = way[way.length - 1];
      if (!nav.reachable(o)) continue;
      p.inn = inn;
      p.out = o;
      p.door = [...way].reverse();
      break;
    }
    if (p.inn) {
      for (const r of rooms) {
        const l = local(s, r.cx, r.cz);
        if (Math.abs(l[0]) > s.w / 2 || Math.abs(l[1]) > s.d / 2) continue;
        const n = Math.min(9, Math.max(2, Math.round((r.hw * r.hd * 4) / 7)));
        for (let i = 0, tries = 0; i < n && tries < n * 5; tries++) {
          const lx = (rand() * 2 - 1) * (r.hw - 0.7);
          const lz = (rand() * 2 - 1) * (r.hd - 0.7);
          const x = r.cx + lx * r.c + lz * r.s;
          const z = r.cz - lx * r.s + lz * r.c;
          const y = g.floor(x, z, r.yb + 0.1);
          if (Number.isNaN(y) || Math.abs(y - r.yb) > 0.3) continue;
          if (Math.hypot(x - p.inn.x, z - p.inn.z) < 1.5 || p.spots.some((q) => Math.hypot(q.x - x, q.z - z) < 1.1)) continue;
          p.spots.push({ x, y, z, seat: false, by: -1, indoor: true });
          i++;
        }
      }
    }
    bySite.set(si, p);
    out.push(p);
  });
  const outdoor = new Map<string, Place>();
  for (const post of posts) {
    let p = post.site !== undefined ? bySite.get(post.site) : undefined;
    if (!p) {
      const o = OUTDOOR[post.tag] ?? OUTDOOR.street;
      p = outdoor.get(o[0]);
      if (!p) {
        p = { id: out.length, def: o[0], kind: o[0], name: o[1], x: 0, z: 0, out: null, inn: null, door: [], spots: [], yard: [], open: [6, 22], here: 0 };
        outdoor.set(o[0], p);
        out.push(p);
      }
    }
    p.yard.push({ x: post.x, y: post.y, z: post.z, ry: post.ry, seat: post.kind === 'seat', ax: post.ax, az: post.az, by: -1, ring: post.ring, indoor: false, post });
  }
  for (const p of outdoor.values()) {
    p.x = p.yard.reduce((a, s) => a + s.x, 0) / p.yard.length;
    p.z = p.yard.reduce((a, s) => a + s.z, 0) / p.yard.length;
  }
  return out;
}

/** The walk from a place's door to one of its indoor spots (cached on the spot). */
export function wayIn(nav: Nav, p: Place, s: Spot): P3[] | null {
  if (!s.indoor) return null;
  if (s.path === undefined) s.path = p.inn ? nav.grid.plan(p.inn, s, 7, 0.3) : null;
  return s.path;
}

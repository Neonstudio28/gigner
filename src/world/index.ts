import * as THREE from 'three';
import { Batcher, Kit, Occupancy, SurfaceMap, type Rect } from './core/kit';
import { Rng } from './core/rng';
import { createLayers, loadPhotoSet } from './textures';
import { MaterialLib, windUniform } from './materials';
import { SignBook } from './signs';
import { createTerrain, groundHeight, heightAt as groundHeightPre, MAP_RADIUS, setDevelopment, waterAt, type WaterHit } from './terrain';
import { createVegetation, type Vegetation, type TreeIndex } from './vegetation';
import { Traffic } from './traffic';
import { Townsfolk } from '../npc/town';
import { npcLib } from '../npc/lib';
import { roadEnds } from './plan/edges';
import { clearZones, zoneAt, rooms, doorways, type Zone, type Doorway } from './buildings/interiors';
import { loadFonts } from './fonts';
import { loadAssets, atlases, asset } from './assets';
import { loadNpcLib } from '../npc/lib';
import { clearPosts, posts, type Post } from '../npc/posts';
import { Nav } from '../npc/nav';
import { SHOTS, type Shot } from './shots';
import type { Ctx } from './buildings/common';
import { buildNetwork } from './plan/roads';
import { Placer, furnishRoads } from './plan/placer';
import { registerTownPads, town } from './plan/town2';
import type { RoadNetwork, RoadHit } from './roads/network';

export interface TownWorldOptions {
  traffic?: boolean;
  /** How many townsfolk walk the sidewalks (0 for none). */
  pedestrians?: number;
  onProgress?: (fraction: number, label: string) => void;
}

export interface MapRoad {
  pts: [number, number][];
  w: number;
  kind: string;
  rank: number;
  /** Street name for map labels ('' = unlabelled). */
  label: string;
  culdesac: { x: number; z: number; R: number } | null;
}

export interface MapData {
  roads: MapRoad[];
  solids: Rect[];
  fields: { x: number; z: number; w: number; d: number }[];
  /** Named places (civic buildings, businesses, parks, job sites). */
  landmarks: { name: string; x: number; z: number; kind: string }[];
}

export interface RoadPoint {
  x: number;
  z: number;
  heading: number;
}

/** A light source in the town (street lamp, lit canopy, neon sign): linear colour and relative power. */
export interface Lamp {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  power: number;
  /** Ceiling light inside a walk-in building. */
  indoor?: boolean;
}

export interface TownWorld {
  /** Add this to your scene. Contains terrain, merged static town, vegetation, animated props and traffic. */
  root: THREE.Group;
  /** Terrain height (metres). */
  heightAt: (x: number, z: number) => number;
  /** Drivable ground: terrain, roads, sidewalks, bridges and viaduct decks (closest to nearY when stacked). */
  groundAt: (x: number, z: number, nearY?: number) => number;
  /** Buildings, props, parked cars, tree trunks and the map edge (y-aware for decks/piers). Water is not solid. */
  solidAt: (x: number, z: number, y?: number) => boolean;
  /** River or lake surface over a point (height and current), or null. */
  waterAt: (x: number, z: number) => WaterHit | null;
  /** Floor (and ceiling, when indoors) of a walk-in building, porch or stair under a point. */
  floorAt: (x: number, z: number, y?: number) => { floor: number; ceil?: number } | null;
  /** The rooms you can walk into. */
  rooms: Zone[];
  /** Road carriageway under (x, z), if any. */
  roadAt: (x: number, z: number, nearY?: number) => RoadHit | null;
  /** Closest drivable lane point and its heading (radians, 0 = +X). */
  nearestRoad: (x: number, z: number, preferHeading?: number) => RoadPoint;
  isOccupied: (x: number, z: number, pad?: number) => boolean;
  roads: RoadNetwork;
  map: MapData;
  shots: Shot[];
  spawn: THREE.Vector3;
  traffic: Traffic;
  /** Sidewalk graph and walkability for the townsfolk. */
  nav: Nav | null;
  doors: Doorway[];
  posts: Post[];
  /** Every building placed: catalog id, centre, facing and footprint. */
  sites: { id: string; name: string; x: number; z: number; ry: number; w: number; d: number }[];
  pedestrians: Townsfolk | null;
  materials: MaterialLib;
  signs: SignBook;
  vegetation: Vegetation;
  /** Street lamps, lit canopies and neon signs (for the coloured glow in the fog). */
  lamps: Lamp[];
  update: (dt: number, elapsed: number, camera: THREE.Vector3, player?: { x: number; y?: number; z: number } | null, env?: { hour?: number; rain?: number; night?: number; flash?: number; driving?: boolean }) => void;
  dispose: () => void;
}

/** Blender-built model families (public/assets/models/<family>.glb). */
const ASSET_FAMILIES = ['structures', 'streetprops', 'furniture', 'vegetation', 'vehicles'];

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Builds the Pine Hollow low-poly Pacific Northwest town (Wallace, Idaho inspired). Deterministic. */
export async function createTownWorld(opts: TownWorldOptions = {}): Promise<TownWorld> {
  const progress = async (f: number, label: string) => {
    opts.onProgress?.(f, label);
    await tick();
  };
  await progress(0.02, 'Loading Google Fonts for signage');
  await loadFonts();
  await progress(0.05, 'Painting textures');
  const materials = new MaterialLib(createLayers(await loadPhotoSet(import.meta.env.BASE_URL)));
  const signs = new SignBook((i, tex) => materials.addSignPage(i, tex));
  await progress(0.07, 'Unpacking the model kit');
  await Promise.all([loadAssets(import.meta.env.BASE_URL, ASSET_FAMILIES), loadNpcLib(import.meta.env.BASE_URL)]);
  for (const [family, tex] of atlases()) materials.addAtlas(family, tex);

  const root = new THREE.Group();
  root.name = 'PineHollow';
  const batch = new Batcher(150);
  const kit = new Kit(batch, materials);
  const occ = new Occupancy();
  const solids = new Occupancy(16);
  occ.solids = solids;
  kit.onSolid = (x, z, w, d, ry, top) => solids.add(x, z, w, d, ry, 0, false, -Infinity, top ?? Infinity);
  // light sources for the volumetric fog, merged per ~4 m cell (a canopy of panels is one glow, not twenty)
  const lightCells = new Map<string, Lamp>();
  kit.onLight = (p, color, power, indoor) => {
    // well above the ground only: skips the lit screens and signs at knee height
    if (p.y - groundHeightPre(p.x, p.z) < 2.2) return;
    const key = `${Math.floor(p.x / 4)},${Math.floor(p.y / 4)},${Math.floor(p.z / 4)}${indoor ? 'i' : ''}`;
    const l = lightCells.get(key);
    if (!l) {
      lightCells.set(key, { x: p.x, y: p.y, z: p.z, r: color.r, g: color.g, b: color.b, power, indoor });
      return;
    }
    const t = power / (l.power + power);
    l.x += (p.x - l.x) * t;
    l.y += (p.y - l.y) * t;
    l.z += (p.z - l.z) * t;
    l.r += (color.r - l.r) * t;
    l.g += (color.g - l.g) * t;
    l.b += (color.b - l.b) * t;
    l.power = Math.min(4, l.power + power);
  };
  const surf = new SurfaceMap();
  const dynamic = new THREE.Group();
  dynamic.name = 'dynamic-props';
  const ctx: Ctx = {
    kit,
    occ,
    rng: new Rng(2024),
    signs,
    surf,
    roads: [],
    dyn: (name, build) => {
      const b = new Batcher(1, false);
      build(new Kit(b, materials));
      const g = new THREE.Group();
      g.name = name;
      b.build((key) => materials.get(key), g);
      dynamic.add(g);
      return g;
    },
  };

  clearZones();
  clearPosts();
  await progress(0.08, 'Grading the valley and laying out roads');
  registerTownPads();
  const net = buildNetwork();
  net.occupy(occ);
  const pl = new Placer(ctx, net);
  // a broken district must not take the whole town down
  const zone = (label: string, fn: () => void) => {
    try {
      fn();
    } catch (err) {
      console.error(`[layout] ${label} failed`, err);
    }
  };
  await progress(0.2, 'Raising the town');
  zone('town', () => town(pl));
  // layout audit: no building (walls or front steps) may stand on a street
  const onRoad = pl.sites.filter((s) => {
    const zf = Math.max(s.def.d / 2, s.def.front ?? 0);
    for (let i = 0; i <= 8; i++)
      for (let j = 0; j <= 8; j++) {
        const [x, z] = Placer.world(s.x, s.z, s.ry, -s.def.w / 2 + (s.def.w * i) / 8, -s.def.d / 2 + ((zf + s.def.d / 2) * j) / 8);
        if (pl.onStreet(x, z, 0)) return true;
      }
    return false;
  });
  if (onRoad.length) console.error('[layout] buildings on a street:', onRoad.map((s) => `${s.def.id}@${s.x.toFixed(0)},${s.z.toFixed(0)}`).join(' '));
  // zoning audit: no home in a zoned no-homes polygon, and none hard up against a civic, shop-row or works building
  const HOME = ['house', 'shack', 'estate', 'trailer'];
  const isHome = (s: (typeof pl.sites)[number]) => !!s.def.tags?.some((t) => HOME.includes(t));
  const zoneOf = (s: (typeof pl.sites)[number]) => {
    const t = s.def.tags ?? [];
    if (t.includes('civic')) return 'civic';
    if (t.includes('main') || t.includes('highway') || t.includes('store') || t.includes('office')) return 'commercial';
    if (t.some((x) => ['industrial', 'works', 'warehouse', 'factory', 'yard'].includes(x))) return 'industrial';
    return '';
  };
  const homes = pl.sites.filter(isHome);
  const zoned = pl.sites.filter((s) => !isHome(s) && zoneOf(s));
  const inZone = homes.filter((h) => pl.zonedOut(h.x, h.z));
  const nextTo = homes.flatMap((h) => {
    const n = zoned.find((s) => Math.hypot(s.x - h.x, s.z - h.z) < Math.max(s.def.w, s.def.d) / 2 + Math.max(h.def.w, h.def.d) / 2 + 14);
    return n ? [`${h.def.id}@${h.x.toFixed(0)},${h.z.toFixed(0)}~${zoneOf(n)}:${n.def.id}`] : [];
  });
  if (inZone.length || nextTo.length) console.warn('[zoning] homes in zoned land:', inZone.map((h) => `${h.def.id}@${h.x.toFixed(0)},${h.z.toFixed(0)}`).join(' '), '| next to non-residential:', nextTo.join(' '));
  (globalThis as { __audit?: unknown }).__audit = { sites: pl.sites.length, onRoad: onRoad.length, homesInZone: inZone.length, homesBesideNonRes: nextTo.length, homes: homes.length, shrubsDropped: (globalThis as { __shrubsDropped?: number }).__shrubsDropped, zoning: [...inZone.map((h) => h.def.id + '@' + h.x.toFixed(0) + ',' + h.z.toFixed(0)), ...nextTo] };
  zone('furnish', () => furnishRoads(pl));
  zone('edges', () => roadEnds(pl));
  // paved after the lots are laid out, so the curbs leave cuts where the driveways cross
  await progress(0.44, 'Paving roads and bridges');
  net.build(kit, solids);
  await progress(0.48, 'Merging static geometry');
  const statics = new THREE.Group();
  statics.name = 'town-static';
  batch.build((key) => materials.get(key), statics);
  await progress(0.58, 'Sculpting mountains, river and lake');
  setDevelopment((x, z) => occ.blocked(x, z, 4) || pl.clearings.some((c) => Math.abs(x - c.x) < c.w / 2 && Math.abs(z - c.z) < c.d / 2));
  const terrain = createTerrain();
  // driveways, mailboxes and parked cars are laid on the finished ground mesh so they follow it exactly
  const late = new Batcher(150);
  const lateKit = new Kit(late, materials);
  lateKit.onSolid = kit.onSolid;
  pl.finish(lateKit);
  late.build((key) => materials.get(key), statics);
  await progress(0.7, 'Growing the forest');
  // shrubs and hedges never grow through each other: an oriented-footprint test drops any that overlap one kept earlier
  {
    const SHRUB = /^(hedge_|bush_|topiary_)/;
    const kept: { x: number; z: number; c: number; s: number; hx: number; hz: number }[] = [];
    const sep = (a: (typeof kept)[number], b: (typeof kept)[number]) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      for (const [ax, az] of [[a.c, -a.s], [a.s, a.c], [b.c, -b.s], [b.s, b.c]]) {
        const d = Math.abs(dx * ax + dz * az);
        const ra = a.hx * Math.abs(a.c * ax - a.s * az) + a.hz * Math.abs(a.s * ax + a.c * az);
        const rb = b.hx * Math.abs(b.c * ax - b.s * az) + b.hz * Math.abs(b.s * ax + b.c * az);
        if (d >= ra + rb) return true;
      }
      return false;
    };
    const grid = new Map<string, number[]>();
    const key = (x: number, z: number) => `${Math.floor(x / 6)},${Math.floor(z / 6)}`;
    let dropped = 0;
    const out = pl.trees.filter((t) => {
      if (!SHRUB.test(t.kind)) return true;
      const size = (asset(t.kind)?.info as { size?: number[] } | undefined)?.size ?? [1.5, 1.5];
      const s = t.s ?? 1;
      // a hedge run may butt end to end, so trim a little off each face before testing
      const me = { x: t.x, z: t.z, c: Math.cos(t.ry ?? 0), s: Math.sin(t.ry ?? 0), hx: Math.max(0.1, (size[0] * s) / 2 - 0.12), hz: Math.max(0.1, (size[1] * s) / 2 - 0.12) };
      const gx = Math.floor(t.x / 6);
      const gz = Math.floor(t.z / 6);
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          for (const n of grid.get(`${gx + i},${gz + j}`) ?? []) if (!sep(me, kept[n])) { dropped++; return false; }
      const k = key(t.x, t.z);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(kept.length);
      kept.push(me);
      return true;
    });
    pl.trees.length = 0;
    pl.trees.push(...out);
    (globalThis as { __shrubsDropped?: number }).__shrubsDropped = dropped;
  }
  const { veg: vegetation, trees } = createVegetation({ occ, trees: pl.trees, cornFields: pl.cornFields, grassPatches: pl.grassPatches, clearings: pl.clearings });
  await progress(0.88, 'Starting traffic');
  const traffic = new Traffic(materials, signs, net);
  traffic.enabled = opts.traffic ?? true;
  root.add(terrain, statics, dynamic, vegetation.group, traffic.group);
  let pedestrians: Townsfolk | null = null;

  // the drawn ground mesh (not the analytic terrain), so cars ride exactly on what is on screen
  const groundAt = (x: number, z: number, nearY?: number) => {
    const t = groundHeight(x, z);
    const r = net.surfaceY(x, z, nearY);
    const s = surf.at(x, z);
    const c = [t, r, s].filter((v) => v > -1e9);
    if (nearY === undefined) return Math.max(...c);
    const ok = c.filter((v) => v <= nearY + 1.3);
    return ok.length ? Math.max(...ok) : Math.min(...c);
  };

  const solidAt = (x: number, z: number, y?: number) => solids.blocked(x, z, 0, y) || (trees as TreeIndex).hit(x, z) || Math.hypot(x, z) > MAP_RADIUS;
  let nav: Nav | null = null;
  try {
    nav = new Nav({ groundAt, floorAt: zoneAt, solidAt, waterAt, roadAt: (x, z, y) => net.roadAt(x, z, y) }, net);
    console.info('[npc] sidewalk graph', JSON.stringify(nav.stats));
    if (npcLib() && opts.pedestrians !== 0) {
      pedestrians = new Townsfolk({ nav, sites: pl.sites.map((s) => ({ id: s.def.id, name: s.def.name, x: s.x, z: s.z, ry: s.ry, w: s.def.w, d: s.def.d })), doors: doorways(), rooms: rooms(), posts: posts(), movers: () => traffic.movers() });
      console.info('[npc] townsfolk', JSON.stringify(pedestrians.info()));
    }
    if (pedestrians) root.add(pedestrians.group);
  } catch (err) {
    console.error('[pedestrians] failed', err);
  }

  return {
    root,
    heightAt: groundHeight,
    groundAt,
    solidAt,
    nav,
    doors: doorways(),
    posts: posts(),
    sites: pl.sites.map((s) => ({ id: s.def.id, name: s.def.name, x: s.x, z: s.z, ry: s.ry, w: s.def.w, d: s.def.d })),
    waterAt,
    floorAt: zoneAt,
    rooms: rooms(),
    roadAt: (x, z, nearY) => net.roadAt(x, z, nearY),
    nearestRoad: (x, z, prefer) => net.nearestLane(x, z, prefer),
    isOccupied: (x, z, pad = 0) => occ.blocked(x, z, pad),
    roads: net,
    map: {
      roads: net.mapData(),
      solids: solids.list.filter((r) => r.hw * r.hd > 3 && r.y1 === Infinity),
      fields: pl.cornFields.map((f) => ({ x: f.x, z: f.z, w: f.w, d: f.d })),
      landmarks: pl.landmarks,
    },
    shots: SHOTS,
    spawn: new THREE.Vector3(-60, 1.7, 2.5),
    traffic,
    get pedestrians() {
      return pedestrians;
    },
    materials,
    signs,
    vegetation,
    lamps: [...lightCells.values()],
    update(dt, elapsed, camera, player, env) {
      windUniform.value = elapsed;
      for (const a of pl.animated) a.update(dt, elapsed);
      traffic.update(dt, camera, player);
      if (pedestrians) {
        pedestrians.update(dt, camera, player, env);
        traffic.walkers = pedestrians.walkers;
      }
      vegetation.update(camera);
    },
    dispose() {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      for (const m of materials.all()) {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
      materials.layers.dispose();
    },
  };
}

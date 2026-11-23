import * as THREE from 'three';
import { Batcher, Kit, Occupancy, SurfaceMap, type Rect } from './core/kit';
import { Rng } from './core/rng';
import { createLayers, loadPhotoSet } from './textures';
import { MaterialLib, windUniform } from './materials';
import { SignBook } from './signs';
import { createTerrain, groundHeight, heightAt as groundHeightPre, MAP_RADIUS, setDevelopment, waterAt, type WaterHit } from './terrain';
import { createVegetation, type Vegetation, type TreeIndex } from './vegetation';
import { Traffic } from './traffic';
import { Pedestrians } from './pedestrians';
import { roadEnds } from './plan/edges';
import { clearZones, zoneAt, rooms, type Zone } from './buildings/interiors';
import { loadFonts } from './fonts';
import { SHOTS, type Shot } from './shots';
import type { Ctx } from './buildings/common';
import { buildNetwork } from './plan/roads';
import { Placer, furnishRoads } from './plan/placer';
import { registerPads, civic, downtown, strip, neighbourhoods, lakeside, industry, dressing } from './plan/zones';
import { registerFarmPads } from './farms';
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
  pedestrians: Pedestrians;
  materials: MaterialLib;
  signs: SignBook;
  vegetation: Vegetation;
  /** Street lamps, lit canopies and neon signs (for the coloured glow in the fog). */
  lamps: Lamp[];
  update: (dt: number, elapsed: number, camera: THREE.Vector3, player?: { x: number; z: number } | null) => void;
  dispose: () => void;
}

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
  await progress(0.08, 'Grading the valley and laying out roads');
  const padY = registerPads();
  registerFarmPads();
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
  await progress(0.2, 'Raising the courthouse, town hall and civic buildings');
  zone('civic', () => civic(pl));
  zone('downtown', () => downtown(pl));
  await progress(0.28, 'Opening the highway strip');
  zone('strip', () => strip(pl));
  await progress(0.33, 'Building Old Town, Maple Grove and Cedar Ridge');
  zone('neighbourhoods', () => neighbourhoods(pl));
  zone('lakeside', () => lakeside(pl));
  await progress(0.4, 'Farms, mill, mine and the power grid');
  zone('industry', () => industry(pl, padY));
  zone('furnish', () => furnishRoads(pl));
  zone('dressing', () => dressing(pl));
  zone('edges', () => roadEnds(pl));
  // paved after the lots are laid out, so the curbs leave cuts where the driveways cross
  await progress(0.44, 'Paving roads, bridges and the I-90 viaduct');
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
  const { veg: vegetation, trees } = createVegetation({ occ, trees: pl.trees, cornFields: pl.cornFields, grassPatches: pl.grassPatches, clearings: pl.clearings });
  await progress(0.88, 'Starting traffic');
  const traffic = new Traffic(materials, signs, net);
  traffic.enabled = opts.traffic ?? true;
  root.add(terrain, statics, dynamic, vegetation.group, traffic.group);
  let pedestrians: Pedestrians | null = null;

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

  try {
    pedestrians = new Pedestrians(materials, net, groundAt, opts.pedestrians ?? 70);
    root.add(pedestrians.group);
  } catch (err) {
    console.error('[pedestrians] failed', err);
  }

  return {
    root,
    heightAt: groundHeight,
    groundAt,
    solidAt: (x, z, y) => {
      return solids.blocked(x, z, 0, y) || (trees as TreeIndex).hit(x, z) || Math.hypot(x, z) > MAP_RADIUS;
    },
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
      return pedestrians!;
    },
    materials,
    signs,
    vegetation,
    lamps: [...lightCells.values()],
    update(dt, elapsed, camera, player) {
      windUniform.value = elapsed;
      for (const a of pl.animated) a.update(dt, elapsed);
      traffic.update(dt, camera, player);
      pedestrians?.update(dt, camera, player);
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

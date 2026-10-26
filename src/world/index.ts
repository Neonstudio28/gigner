import * as THREE from 'three';
import { Batcher, Kit, Occupancy, SurfaceMap, type Rect } from './core/kit';
import { Rng } from './core/rng';
import { createLayers } from './textures';
import { MaterialLib, windUniform } from './materials';
import { SignBook } from './signs';
import { createTerrain, heightAt, isWater, MAP_RADIUS } from './terrain';
import { createVegetation, type Vegetation, type TreeIndex } from './vegetation';
import { Traffic } from './traffic';
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

export interface TownWorld {
  /** Add this to your scene. Contains terrain, merged static town, vegetation, animated props and traffic. */
  root: THREE.Group;
  /** Terrain height (metres). */
  heightAt: (x: number, z: number) => number;
  /** Drivable ground: terrain, roads, sidewalks, bridges and viaduct decks (closest to nearY when stacked). */
  groundAt: (x: number, z: number, nearY?: number) => number;
  /** Buildings, props, parked cars, tree trunks, water and the map edge (y-aware for decks/piers). */
  solidAt: (x: number, z: number, y?: number) => boolean;
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
  materials: MaterialLib;
  signs: SignBook;
  vegetation: Vegetation;
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
  const materials = new MaterialLib(createLayers());
  const signs = new SignBook((i, tex) => materials.addSignPage(i, tex));

  const root = new THREE.Group();
  root.name = 'PineHollow';
  const batch = new Batcher(150);
  const kit = new Kit(batch, materials);
  const occ = new Occupancy();
  const solids = new Occupancy(16);
  occ.solids = solids;
  kit.onSolid = (x, z, w, d, ry) => solids.add(x, z, w, d, ry, 0, false);
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

  await progress(0.08, 'Grading the valley and laying out roads');
  const padY = registerPads();
  registerFarmPads();
  const net = buildNetwork();
  net.occupy(occ);
  await progress(0.14, 'Paving roads, bridges and the I-90 viaduct');
  net.build(kit, solids);
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
  await progress(0.48, 'Merging static geometry');
  const statics = new THREE.Group();
  statics.name = 'town-static';
  batch.build((key) => materials.get(key), statics);
  await progress(0.58, 'Sculpting mountains, river and lake');
  const terrain = createTerrain();
  await progress(0.7, 'Growing the forest');
  const { veg: vegetation, trees } = createVegetation({ occ, trees: pl.trees, cornFields: pl.cornFields, grassPatches: pl.grassPatches, clearings: pl.clearings });
  await progress(0.88, 'Starting traffic');
  const traffic = new Traffic(materials, signs, net);
  traffic.enabled = opts.traffic ?? true;
  root.add(terrain, statics, dynamic, vegetation.group, traffic.group);

  const groundAt = (x: number, z: number, nearY?: number) => {
    const t = heightAt(x, z);
    const r = net.surfaceY(x, z, nearY);
    const s = surf.at(x, z);
    const c = [t, r, s].filter((v) => v > -1e9);
    if (nearY === undefined) return Math.max(...c);
    const ok = c.filter((v) => v <= nearY + 1.3);
    return ok.length ? Math.max(...ok) : Math.min(...c);
  };

  return {
    root,
    heightAt,
    groundAt,
    solidAt: (x, z, y) => {
      if (solids.blocked(x, z, 0, y) || (trees as TreeIndex).hit(x, z) || Math.hypot(x, z) > MAP_RADIUS) return true;
      if (isWater(x, z)) return !net.roadAt(x, z, y);
      return false;
    },
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
    spawn: new THREE.Vector3(-30, 1.7, -206),
    traffic,
    materials,
    signs,
    vegetation,
    update(dt, elapsed, camera, player) {
      windUniform.value = elapsed;
      for (const a of pl.animated) a.update(dt, elapsed);
      traffic.update(dt, camera, player);
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

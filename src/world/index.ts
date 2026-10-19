import * as THREE from 'three';
import { Batcher, Kit, Occupancy, SurfaceMap, type Rect } from './core/kit';
import { Rng } from './core/rng';
import { createLayers } from './textures';
import { MaterialLib, windUniform } from './materials';
import { SignBook } from './signs';
import { buildTown } from './town';
import { createTerrain, heightAt, isWater, MAP_RADIUS } from './terrain';
import { createVegetation, type Vegetation, type TreeIndex } from './vegetation';
import { Traffic } from './traffic';
import { loadFonts } from './fonts';
import { SHOTS, type Shot } from './shots';
import type { Ctx, RoadRect } from './buildings/common';

export interface TownWorldOptions {
  traffic?: boolean;
  onProgress?: (fraction: number, label: string) => void;
}

export interface MapData {
  roads: RoadRect[];
  solids: Rect[];
  fields: { x: number; z: number; w: number; d: number }[];
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
  /** Drivable ground height: terrain plus kerbs, sidewalks and plazas. */
  groundAt: (x: number, z: number) => number;
  /** True for buildings, props, parked cars, tree trunks, water and the map edge. */
  solidAt: (x: number, z: number) => boolean;
  /** Road surface under (x, z), if any. */
  roadAt: (x: number, z: number) => RoadRect | null;
  /** Closest drivable lane point and its heading (radians, 0 = +X). */
  nearestRoad: (x: number, z: number, preferHeading?: number) => RoadPoint;
  /** True if (x, z) is covered by a road, building, lot or other placed feature. */
  isOccupied: (x: number, z: number, pad?: number) => boolean;
  map: MapData;
  shots: Shot[];
  spawn: THREE.Vector3;
  traffic: Traffic;
  materials: MaterialLib;
  signs: SignBook;
  vegetation: Vegetation;
  /** Advance wind, windmill, traffic and vegetation LOD. */
  update: (dt: number, elapsed: number, camera: THREE.Vector3, player?: { x: number; z: number } | null) => void;
  dispose: () => void;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Builds the Pine Hollow low-poly Pacific Northwest town. Deterministic: same world every time. */
export async function createTownWorld(opts: TownWorldOptions = {}): Promise<TownWorld> {
  const progress = async (f: number, label: string) => {
    opts.onProgress?.(f, label);
    await tick();
  };
  await progress(0.02, 'Loading Google Fonts for signage');
  await loadFonts();
  await progress(0.06, 'Painting textures');
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
  const roads: RoadRect[] = [];
  const dynamic = new THREE.Group();
  dynamic.name = 'dynamic-props';
  const ctx: Ctx = {
    kit,
    occ,
    rng: new Rng(2024),
    signs,
    surf,
    roads,
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

  await progress(0.12, 'Building downtown, the courthouse square and homes');
  const layout = buildTown(ctx);
  await progress(0.42, 'Merging static geometry');
  const statics = new THREE.Group();
  statics.name = 'town-static';
  batch.build((key) => materials.get(key), statics);
  await progress(0.56, 'Sculpting valley, farms and mountains');
  const terrain = createTerrain();
  await progress(0.7, 'Growing the pine forest and orchards');
  const { veg: vegetation, trees } = createVegetation({ occ, ...layout.veg });
  await progress(0.88, 'Starting traffic');
  const traffic = new Traffic(materials, signs);
  traffic.enabled = opts.traffic ?? true;
  root.add(terrain, statics, dynamic, vegetation.group, traffic.group);

  const fields = layout.veg.cornFields.map((f) => ({ x: f.x, z: f.z, w: f.w, d: f.d }));
  return {
    root,
    heightAt,
    groundAt: (x, z) => Math.max(heightAt(x, z), surf.at(x, z)),
    solidAt: (x, z) => solids.blocked(x, z) || (trees as TreeIndex).hit(x, z) || isWater(x, z) || Math.hypot(x, z) > MAP_RADIUS,
    roadAt: (x, z) => roads.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null,
    nearestRoad: (px, pz, prefer) => nearestRoad(roads, px, pz, prefer),
    isOccupied: (x, z, pad = 0) => occ.blocked(x, z, pad),
    map: { roads, solids: solids.list.filter((r) => r.hw * r.hd > 3), fields },
    shots: SHOTS,
    spawn: layout.spawn,
    traffic,
    materials,
    signs,
    vegetation,
    update(dt, elapsed, camera, player) {
      windUniform.value = elapsed;
      for (const a of layout.animated) a.update(dt, elapsed);
      traffic.update(dt, player);
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

function nearestRoad(roads: RoadRect[], px: number, pz: number, prefer = 0): RoadPoint {
  let best: RoadPoint = { x: 0, z: 2, heading: 0 };
  let bd = Infinity;
  for (const r of roads) {
    if (r.kind === 'dirt') continue;
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    if (Math.min(w, d) < 6) continue;
    const alongX = w >= d;
    const cx = Math.min(Math.max(px, r.x0 + 3), r.x1 - 3);
    const cz = Math.min(Math.max(pz, r.z0 + 3), r.z1 - 3);
    const dist = Math.hypot(cx - px, cz - pz);
    if (dist >= bd) continue;
    bd = dist;
    if (alongX) {
      const east = Math.cos(prefer) >= 0;
      const mid = (r.z0 + r.z1) / 2;
      // right-hand traffic: eastbound uses the south (+z) lane
      best = { x: cx, z: mid + (east ? 1 : -1) * Math.min(1.95, d / 4), heading: east ? 0 : Math.PI };
    } else {
      const north = Math.sin(prefer) >= 0;
      const mid = (r.x0 + r.x1) / 2;
      best = { x: mid + (north ? 1 : -1) * Math.min(1.95, w / 4), z: cz, heading: north ? Math.PI / 2 : -Math.PI / 2 };
    }
  }
  return best;
}

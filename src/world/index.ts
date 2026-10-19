import * as THREE from 'three';
import { Batcher, Kit, Occupancy } from './core/kit';
import { Rng } from './core/rng';
import { createTextures } from './textures';
import { MaterialLib, windUniform } from './materials';
import { SignBook } from './signs';
import { buildTown } from './town';
import { createTerrain, heightAt } from './terrain';
import { createVegetation } from './vegetation';
import { Traffic } from './traffic';
import { loadFonts } from './fonts';
import { SHOTS, type Shot } from './shots';
import type { Ctx } from './buildings/common';

export interface TownWorldOptions {
  traffic?: boolean;
  onProgress?: (fraction: number, label: string) => void;
}

export interface TownWorld {
  /** Add this to your scene. Contains terrain, merged static town, vegetation, animated props and traffic. */
  root: THREE.Group;
  /** Ground height (metres) for placing characters/props. */
  heightAt: (x: number, z: number) => number;
  /** True if (x, z) is covered by a road, building, lot or other placed feature. */
  isOccupied: (x: number, z: number, pad?: number) => boolean;
  shots: Shot[];
  spawn: THREE.Vector3;
  traffic: Traffic;
  materials: MaterialLib;
  /** Advance wind, windmill and traffic animation. */
  update: (dt: number, elapsed: number) => void;
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
  await progress(0.08, 'Painting textures');
  const textures = createTextures();
  const materials = new MaterialLib(textures);
  const signs = new SignBook();

  const root = new THREE.Group();
  root.name = 'PineHollow';
  const batch = new Batcher(90);
  const kit = new Kit(batch, (t) => materials.signKey(t));
  const occ = new Occupancy();
  const dynamic = new THREE.Group();
  dynamic.name = 'dynamic-props';
  const ctx: Ctx = {
    kit,
    occ,
    rng: new Rng(2024),
    signs,
    dyn: (name, build) => {
      const b = new Batcher(1, false);
      build(new Kit(b, (t) => materials.signKey(t)));
      const g = new THREE.Group();
      g.name = name;
      b.build((key) => materials.get(key), g);
      dynamic.add(g);
      return g;
    },
  };

  await progress(0.15, 'Building Main Street, homes and farms');
  const layout = buildTown(ctx);
  await progress(0.45, 'Merging static geometry');
  const statics = new THREE.Group();
  statics.name = 'town-static';
  batch.build((key) => materials.get(key), statics);
  await progress(0.6, 'Sculpting valley and mountains');
  const terrain = createTerrain();
  await progress(0.72, 'Growing the pine forest');
  const vegetation = createVegetation({ occ, ...layout.veg });
  await progress(0.9, 'Starting traffic');
  const traffic = new Traffic(materials, signs);
  traffic.enabled = opts.traffic ?? true;

  root.add(terrain, statics, dynamic, vegetation, traffic.group);

  return {
    root,
    heightAt,
    isOccupied: (x, z, pad = 0) => occ.blocked(x, z, pad),
    shots: SHOTS,
    spawn: layout.spawn,
    traffic,
    materials,
    update(dt, elapsed) {
      windUniform.value = elapsed;
      for (const a of layout.animated) a.update(dt, elapsed);
      traffic.update(dt);
    },
    dispose() {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      for (const m of materials.all()) {
        const map = (m as THREE.MeshStandardMaterial).map;
        map?.dispose();
        m.dispose();
      }
    },
  };
}

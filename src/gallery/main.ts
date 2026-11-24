import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Batcher, Kit, Occupancy, SurfaceMap } from '../world/core/kit';
import { Rng } from '../world/core/rng';
import { createLayers } from '../world/textures';
import { MaterialLib } from '../world/materials';
import { SignBook } from '../world/signs';
import { loadFonts } from '../world/fonts';
import { patchFlatShadingNaN } from '../engine/post';
import type { Ctx } from '../world/buildings/common';
import type { BuildingDef } from '../world/buildings/catalog';
import { loadAssets, atlases } from '../world/assets';

/**
 * Standalone viewer for building catalogs (no terrain/post), fast enough for software GL.
 * gallery.html?set=houses|strip|civic[&only=<id>][&view=front|back|top][&cols=4]
 */
const SETS: Record<string, () => Promise<BuildingDef[]>> = {
  houses: async () => (await import('../world/buildings/houses')).HOUSES,
  strip: async () => (await import('../world/buildings/strip90s')).STRIP,
  civic: async () => (await import('../world/buildings/civic2')).CIVIC,
  town: async () => (await import('../world/buildings/town')).TOWN,
  b2: async () => (await import('../world/b2')).B2,
  people: async () => {
    const { person, cast, randomPerson, POSES } = await import('../world/people');
    const { assetNames } = await import('../world/assets');
    const { Rng } = await import('../world/core/rng');
    const rng = new Rng(5);
    const poses = Object.keys(POSES) as (keyof typeof POSES)[];
    return [
      {
        id: 'cast', name: 'cast', w: 30, d: 8, tags: [],
        build: (c, x, z) => {
          const names = assetNames('people').filter((n) => !/briefcase|coffee|guitar|newspaper|shopping|umbrella/.test(n));
          names.forEach((n, i) => person(c.kit, x - 12 + (i % 15) * 1.7, z + 2 - Math.floor(i / 15) * 3, 0.3, cast(rng, n)));
        },
      },
      {
        id: 'poses', name: 'poses', w: 30, d: 8, tags: [],
        build: (c, x, z) => {
          poses.forEach((p, i) => {
            if (p === 'sit') c.kit.box(x - 9 + i * 2, 0, z - 0.25, 0.6, 0.45, 0.5, 0x8a6a4a);
            person(c.kit, x - 9 + i * 2, z, 0.5, { ...cast(rng, ['casual_m_1', 'casual_f_2', 'farmer'][i % 3], p) });
          });
        },
      },
    ];
  },
  cars: async () => {
    const { vehicle } = await import('../world/vehicles');
    const names = ['sedan_80s', 'sedan_luxury', 'hatch_compact', 'wagon_woody', 'coupe_80s', 'muscle_70s', 'pony_80s', 'sports_70s', 'roadster', 'pickup_80s', 'pickup_50s', 'pickup_4x4', 'van_cargo', 'suv_boxy', 'police_sedan', 'police_suv', 'tow_truck', 'offroad_open', 'step_van'];
    const cols = [0x3f6f9a, 0xb3261e, 0xe3b81f, 0x5d7a52, 0xe9e6dc, 0xe0701c, 0x2f6b3f, 0xc8b386, 0x4f8f8a];
    return names.map((n, i) => ({ id: n, name: n, w: 3, d: 6, tags: [], build: (c, x, z) => vehicle(c.kit, c.signs, 'sedan', x, z, -Math.PI / 2 + 0.5, cols[i % cols.length], { model: n }) }));
  },
};

async function main() {
  const q = new URLSearchParams(location.search);
  const info = document.getElementById('info')!;
  patchFlatShadingNaN();
  await loadFonts();
  let defs = await (SETS[q.get('set') ?? 'houses'] ?? SETS.houses)();
  const only = q.get('only');
  if (only) defs = defs.filter((d) => only.split(',').includes(d.id));
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9bdd4);
  scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x6a6f4a, 1.4));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun, sun.target);

  const mats = new MaterialLib(createLayers());
  await loadAssets(import.meta.env.BASE_URL, ['structures', 'streetprops', 'furniture', 'vegetation', 'vehicles', 'people']);
  for (const [family, tex] of atlases()) mats.addAtlas(family, tex);
  const signs = new SignBook((i, t) => mats.addSignPage(i, t));
  const batch = new Batcher(1e6, false);
  const kit = new Kit(batch, mats);
  const occ = new Occupancy();
  const c: Ctx = { kit, occ, rng: new Rng(1), signs, surf: new SurfaceMap(), roads: [], dyn: () => new THREE.Group() };
  const cols = Number(q.get('cols') ?? Math.ceil(Math.sqrt(defs.length)));
  let x = 0;
  let z = 0;
  let rowD = 0;
  let maxX = 0;
  const labels: string[] = [];
  defs.forEach((d, i) => {
    if (i > 0 && i % cols === 0) {
      x = 0;
      z += rowD + 14;
      rowD = 0;
    }
    d.build(c, x + d.w / 2, z + d.d / 2, 0, i + 1);
    kit.plane(x + d.w / 2, 0.01, z + d.d / 2, d.w, d.d, 0x9a9a9a, 'concrete');
    labels.push(`${d.id} (${d.w}×${d.d})`);
    x += d.w + 12;
    maxX = Math.max(maxX, x);
    rowD = Math.max(rowD, d.d);
  });
  const W = Math.max(maxX, 10);
  const D = z + rowD;
  kit.plane(W / 2, 0, D / 2, W + 80, D + 80, 0x6f8f3f, 'paint');
  batch.build((k) => mats.get(k), scene);
  const ctr = new THREE.Vector3(W / 2, 0, D / 2);
  const span = Math.max(W, D);
  sun.position.set(ctr.x - span * 0.4, span * 0.9 + 30, ctr.z + span * 0.7);
  sun.target.position.copy(ctr);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -span;
  sc.right = sc.top = span;
  sc.far = span * 4 + 100;
  sc.updateProjectionMatrix();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 5000);
  const view = q.get('view') ?? 'front';
  const dist = span * (defs.length === 1 ? 1.5 : 0.95) + 12;
  if (view === 'top') camera.position.set(ctr.x, dist * 1.3, ctr.z + 1);
  else if (view === 'back') camera.position.set(ctr.x + dist * 0.35, dist * 0.45, ctr.z - dist * 0.9);
  else camera.position.set(ctr.x - dist * 0.35, dist * 0.42, ctr.z + dist * 0.9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(ctr).setY(4);
  // cam=x,y,z&tgt=x,y,z are relative to the first building's centre (interior and detail views)
  const v3 = (key: string) => q.get(key)?.split(',').map(Number);
  const cam = v3('cam');
  if (cam && defs[0]) {
    const o = new THREE.Vector3(defs[0].w / 2, 0, defs[0].d / 2);
    camera.position.set(o.x + cam[0], cam[1], o.z + cam[2]);
    const t = v3('tgt') ?? [0, 1.5, 0];
    controls.target.set(o.x + t[0], t[1], o.z + t[2]);
    camera.fov = Number(q.get('fov') ?? 60);
    camera.near = 0.1;
    camera.updateProjectionMatrix();
  }
  controls.update();
  info.textContent = labels.join(' · ');
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    render();
  });
  render();
  render();
  document.body.dataset.ready = '1';
}

main().catch((e) => {
  document.getElementById('info')!.textContent = 'ERROR: ' + (e instanceof Error ? e.stack ?? e.message : String(e));
  document.body.dataset.ready = 'error';
});

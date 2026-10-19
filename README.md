# Pine Hollow — Low-Poly Pacific Northwest Town (Three.js)

A rural American PNW town in a forested valley, built entirely in **Three.js** in the stylised low-poly look of the reference shots: brick Main Street, Don's Donuts with its giant rooftop donut, 86 Gasoline, a white church, sheriff's office, motel, cinder-block warehouse with a timber water tower, homes, farms, a lumber yard, a used-car lot, and pine forest all the way to snow-capped mountains.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

URL options: `?shot=<id>` (main, intersection, carlot, aerial, houses, lumber, farm, warehouse, corner, porch, valley, lake, highway), `?quality=low|medium|high`, `?ui=0`, `?tour=1`, `?traffic=0`, `?ao=0`, `?still=1` (renders a few frames and then idles, for headless/software-GL screenshots).

## Controls

`1`–`0` camera presets · `N` next shot · `T` cinematic tour · `F` free-fly (WASD, Q/E, Shift) · `H` hide UI · mouse drag to orbit. The panel (top right) adjusts sun bearing/elevation, exposure, haze, AO, bloom, tone mapping and traffic, and **exports the whole world as `.glb`** for Unity, Unreal, Godot or Blender.

## Use it in your game

```ts
import { createTownWorld } from './src/world';

const world = await createTownWorld({ traffic: true });
scene.add(world.root);
world.heightAt(x, z);        // ground height for characters/props
world.isOccupied(x, z, pad); // roads/buildings/lots, for spawn checks
// every frame:
world.update(dt, elapsedSeconds);
```

`src/engine/` holds the reusable lighting and post rig (`SkyRig`, `PostFX`, `CameraDirector`). The world is deterministic, so every load produces the same town.

## How it is built

- **Geometry:** procedural modelling kits (`src/world/buildings`, `vehicles.ts`, `props.ts`, `people.ts`). Static parts are merged per material and spatial chunk to keep draw calls low (~400–800 per frame).
- **Vegetation:** about 16k instanced firs, pines, oaks, bushes, grass and corn, with GPU wind sway.
- **Terrain:** a flat valley floor, faceted forested foothills, a lake, and a distant ring of snow-capped mountains with a hero volcano.
- **Lighting:** a Poly Haven HDRI drives both the sky and image-based lighting. The sun is rotated to match the HDRI. Shadows use a camera-fitted, texel-snapped map. Exponential haze softens distance.
- **Post (pmndrs/postprocessing):** N8AO ambient occlusion → NaN guard → bloom → ACES filmic → grade → vignette → SMAA.
- **Textures:** brick, siding, metal roofing, shingles, cinder block, concrete and asphalt are generated procedurally on canvas. Signage uses Google Fonts.

## Credits

| Asset / library | Source | License |
|---|---|---|
| Sky HDRI “Kloofendal 48d Partly Cloudy (Pure Sky)” — Greg Zaal, Jarod Guest | polyhaven.com | CC0 |
| Fonts: Alfa Slab One, Oswald, Lobster, Rye, Bebas Neue | Google Fonts via Fontsource | OFL-1.1 |
| three.js | github.com/mrdoob/three.js | MIT |
| postprocessing | github.com/pmndrs/postprocessing | Zlib |
| N8AO | github.com/N8python/n8ao | ISC |
| lil-gui, simplex-noise | npm | MIT |
| Agent skill references (lighting, performance, post-processing) | github.com/CloudAI-X/threejs-skills | — |

The lighting HDRI (`public/assets/sky/sky_ibl_1k.hdr`) has the sun disc clamped and the mirrored lower hemisphere replaced with ground bounce. The background JPG is a downscaled, slightly lightened copy of the Poly Haven tonemapped image.

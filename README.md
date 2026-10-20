# Pine Hollow — Low-Poly Pacific Northwest Town (Three.js)

Pine Hollow is a 1990s mining town in a forested Idaho valley, modelled on **Wallace, Idaho**. It is built entirely in **Three.js** in a stylised low-poly look and designed as a backdrop for a small-town role-play game: police, sheriff, fire, EMS, lawyers and detectives.

![Pine Hollow](docs/screenshots/pine-hollow-v3.jpg)

## The town

The valley runs east–west between steep forested mountains. Individual peaks sit close to town; the distant ring of mountains stays on the horizon.
- **The South Fork river** comes out of the western canyon, runs along the north edge of downtown and empties into Spirit Lake.
- **I-90** is the only through road. It is a four-lane interstate on a viaduct above downtown (like Wallace's 1991 viaduct), with full interchanges at Exits 61 and 62.

| District | What's there |
|---|---|
| **Historic downtown** | A compact Wallace-style grid: Bank St and Cedar St crossed by 2nd–8th St. It has brick storefronts, Don's Donuts, the Liberty Theater, Hotel Cascade, diners, pizza, a bakery, a laundromat and a tavern, with back alleys behind the shops. |
| **Civic buildings** | Each sits on its own block: the Pine County Courthouse (Bank St), City Hall (Cedar St, same scale as the courthouse), Carnegie library, Catholic church, fire station, funeral home, Sheriff & Jail and a law office. The police station is on the strip. |
| **River St & Heritage Park** | The Northern Pacific depot, a gazebo and a memorial by the river. |
| **Old Town** | Victorian houses, miner's cottages, Craftsman bungalows and foursquares on curving streets that climb the south hill. A cul-de-sac sits on Hill St, and the water tower overlooks the town. |
| **Front Street strip** | The 1990s I-90 business strip: Big Bun Burgers, Taco Shack, Pizza Palace, Clucker's, Dairy Dream, Rewind Video, a strip mall (arcade, laundromat, electronics, takeout, salon), Bowl-O-Rama, Thrifty Mart, a car wash, a truck stop, Cascade Motors, two motels, the Starlite Drive-In, gas stations and the police station. |
| **Silver Heights** | A post-war suburb: a curving loop with six cul-de-sacs, Cape Cods, ranches, split-levels and duplexes, plus the elementary school. |
| **East side** | Silver Valley Medical Center (ER, ambulances, helipad), Riverside Mobile Home Park and the Elm Crescent suburb. |
| **Spirit Lake** | Lake Rd loops around the shore past log cabins with private docks to the Spirit Lake Marina. |
| **Out of town** | Cascade Lumber mill (tepee burner, log decks), Sierra Silver mine (timber headframe), a high-voltage line with Substation 4, four farms (Miller Dairy, Ridgeview, Sunny Acres Orchard, Hansen) and the high school with its football field. |

**Road types.** Each has its own cross-section and markings:
- **Interstate:** barrier, lane lines and guardrails.
- **Ramps.**
- **Old highway:** double yellow line and gravel shoulders.
- **Strip:** centre turn lane.
- **Downtown:** parking lanes and wide sidewalks.
- **Residential:** grass park strip and sidewalks.
- **Suburban:** wider grass strip.
- **Rural, gravel and dirt:** dirt has a grassy crown.
- **Alleys.**

Bridges carry roads over the river. The terrain is graded to meet every road.

**Atmosphere.** The look is grey-green Pacific Northwest, not a bright postcard. The Poly Haven HDRI sky is kept, with its horizon blended into the haze. On top of it:
- exponential height fog that pools in the valley, with sun in-scattering;
- drifting mist banks over the forest, river and lake;
- rain-darkened glossy roads with puddles;
- windows that light up at dusk;
- a filmic grade with teal shadows and warm highlights, plus light film grain.

Presets: **PNW Mist** (default), **Overcast Drizzle**, **Golden Hour**, **Dusk** and **Clear Day**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (building gallery: /gallery.html?set=houses|strip|civic)
npm run build      # static build in dist/
```

URL options:
- `?shot=<id>`: bank, courthouse, townhall, viaduct, strip, downtown, suburb, oldtown, lake, valley, hospital, trailer, river, mill, mine, pylons, dairy, hansen, interchange, canyon.
- `?atmo=pnwmist|overcastdrizzle|goldenhour|dusk|clearday`, `?quality=low|medium|high`, `?ui=0`, `?tour=1`, `?traffic=0`, `?ao=0`.
- `?still=1` renders a few frames and then idles. Use it for headless or software-GL screenshots.

## Controls

**Exploring:** `1`–`0` camera presets · `N` next shot · `T` cinematic tour · `F` free-fly (WASD, Q/E, Shift) · `H` hide UI · mouse drag to orbit.

**Driving (`V` to get in or out):**
- `W`/`S` throttle and brake (hold `S` to reverse) · `A`/`D` steer · `Space` handbrake · `Shift` boost.
- `C` cycles the camera: chase, far chase, cockpit. Drag the mouse to look around.
- `R` resets to the nearest road · `M` full map.

There are 15 vehicles, each with its own handling. Cars collide with buildings, props, parked cars, trees, bridge parapets and traffic. Vehicles follow the road decks, so you can drive over the viaduct, bridges and ramps. AI traffic runs on I-90 and the old highway through town.

The panel (top right) controls the atmosphere preset, fog, mist, wetness, lit windows, lighting, post FX, vehicle and paint, and traffic. It can also export the whole world as `.glb` for Unity, Unreal, Godot or Blender.

## Use it in your game

```ts
import { createTownWorld } from './src/world';

const world = await createTownWorld({ traffic: true });
scene.add(world.root);
world.groundAt(x, z, nearY);   // drivable ground: terrain, roads, sidewalks, bridges, viaduct deck
world.solidAt(x, z, y);        // buildings, props, trunks, water, map edge
world.roadAt(x, z, nearY);     // road under a point (kind: highway/road/alley/dirt, lateral offset…)
world.nearestRoad(x, z);       // lane point + heading for spawning vehicles
world.roads                    // the road graph (splines, lanes, frontage helpers)
// every frame:
world.update(dt, elapsedSeconds, camera.position, playerPosition);
```

## How it is built

- **`src/world/terrain.ts`:** the valley floor, steep walls, close peaks, the river (carved channel and water ribbon) and the lake. Heights come from a pipeline: natural → flattened pads → graded roads → river channel.
- **`src/world/roads/network.ts`:** Catmull-Rom spline roads with typed cross-sections and terrain-following profiles. It also handles viaducts and ramps, junction height matching and trimming, cul-de-sac bulbs, bridges, piers, parapets, guardrails, stop lines, spatial queries and lanes for traffic.
- **`src/world/plan/`:** the town plan (`roads.ts`) and the zone builders (`zones.ts`). `placer.ts` places buildings along road frontage and around cul-de-sacs, with free-space and slope checks, foundations, driveways, mailboxes and parked cars.
- **`src/world/buildings/`:** procedural building catalogs: `houses.ts` (17 home styles, seed-varied), `strip90s.ts` (1990s highway businesses), `civic2.ts` (courthouse, city hall, hospital, schools, depot, mine and more), plus the earlier downtown and commercial builders.
- **`src/engine/atmosphere.ts`:** height fog, mist, presets. `post.ts` holds the N8AO → bloom → ACES → grade → vignette → grain stack. `sky.ts` matches the sun to the HDRI.
- **Performance:**
  - One shared material (texture array, per-vertex PBR) and a sign atlas keep static geometry to a few hundred draw calls.
  - Vegetation uses two-level chunked LOD.
  - Distant traffic is culled, and resolution adapts to the frame rate.

## Credits

| Asset / library | Source | License |
|---|---|---|
| Sky HDRI “Kloofendal 48d Partly Cloudy (Pure Sky)” — Greg Zaal, Jarod Guest | polyhaven.com | CC0 |
| Fonts: Alfa Slab One, Oswald, Lobster, Rye, Bebas Neue | Google Fonts via Fontsource | OFL-1.1 |
| three.js | github.com/mrdoob/three.js | MIT |
| postprocessing | github.com/pmndrs/postprocessing | Zlib |
| N8AO | github.com/N8python/n8ao | ISC |
| lil-gui, simplex-noise | npm | MIT |
| Agent skill references (lighting, performance, post-processing, geometry) | github.com/CloudAI-X/threejs-skills | — |
| Layout references | Wallace, Idaho visitor maps (silvervalleyidaho.com), Business Loop I-90 history (AARoads), National Register Wallace Historic District nomination | reference only |

The lighting HDRI (`public/assets/sky/sky_ibl_1k.hdr`) has the sun disc clamped and the mirrored lower hemisphere replaced with ground bounce. The background JPG is a downscaled, slightly lightened copy of the Poly Haven tonemapped image.

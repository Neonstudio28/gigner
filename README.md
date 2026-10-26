# Pine Hollow — Low-Poly Pacific Northwest Town (Three.js)

Pine Hollow is a 1990s timber-and-mining county seat in a broad Pacific Northwest river valley. It is built entirely in **Three.js** in a stylised low-poly look and laid out as a backdrop for a role-play game where you can take any job in town: police, sheriff, fire, EMS, doctors, lawyers, judges, mechanics, tow drivers, truckers, loggers, miners, farmers, shopkeepers, teachers, reporters and more.

![Pine Hollow](docs/screenshots/pine-hollow-v3.jpg)

## The town

The valley runs east–west. Its floor is wide (about 3.7 km by 1.3 km); forested foothills rise gently from the edges, and the big snow peaks stay on the distant ring.
- **The South Fork river** (30–44 m wide) comes out of the western canyon, runs past the lumber mill and the downtown riverfront, then bends south into Spirit Lake.
- **I-90** runs along the foot of the northern slopes. It rises onto short overpasses at three diamond interchanges: **Exit 60** (Mill Rd), **Exit 62** (Bridge St, straight to Courthouse Square) and **Exit 64** (Spirit Lake Rd).
- **Old Highway 10** is the town's spine: it becomes **Main Street** through downtown and **Front Street** along the highway strip.

The layout follows a classic county-seat plan:
- a gridded downtown around a courthouse square;
- an alley-backed residential grid;
- curvilinear post-war subdivisions with loop roads and cul-de-sacs at the edge of town;
- a highway strip near the interstate;
- industry on the river flats;
- farms and cabins out in the valley.

| District | What's there |
|---|---|
| **Courthouse Square** | The Pine County Courthouse in a park block with lawns, a gazebo, fountain, war memorial and flag. It faces Main St and the Bridge St axis from Exit 62. |
| **Downtown · Main Street** | Two-storey brick blocks on 1st–4th Ave W/E with parking lanes, globe lamps and back alleys. Businesses include Hotel Cascade, the Liberty Theater, First Pine Bank, the Gazette, hardware, sporting goods, a pharmacy, bakery, diner and saloons. There are also jewelers, a music store, electronics, outfitters, a credit union, Mountain Bell, the Woodworkers Local 3-38 union hall, an arcade, a gym, a pet supply store, a thrift store, a taxidermist and an espresso bar. |
| **Civic Center (Court St)** | One civic building per block: Fire Station 1, the ambulance (EMS) station, City Hall, the Police Dept., the Sheriff & Jail, the Carnegie Library, two churches, VFW and Elks halls, and a law firm. Across Court St are the County Assessor, Clerk, DMV, Chamber of Commerce, bail bonds, Public Defender, District Attorney, Probation, Pacific Power, the KPHR studios, a funeral home, the Masonic Lodge and a B&B. |
| **Riverfront** | Riverwalk Park with a bandstand, the old depot (visitor center with a caboose), Timber Ridge Brewing, the river outfitter and a boat launch. |
| **Old Town** | An alley-backed grid (Pine, Cedar, Alder and Hemlock Sts) of Victorians, miner's cottages, Craftsman bungalows, foursquares and duplexes, with townhouse rows nearest downtown. |
| **Church Hill** | Hillside streets with cottages and cabins, Pine Hollow Cemetery and the Hillside Chapel. |
| **Cedar Ridge** | The upscale district on the hill above Old Town: lodge-style and colonial estates on curving drives and cul-de-sacs, gate pillars and the water tower. |
| **Eastside** | Pine Hollow High School (Home of the Loggers) and Logger Field, plus the family clinic, dentist, realtor, insurance agent and daycare on Pine St. |
| **Front Street Strip** | Gas 86, Big Bun Burgers, Taco Shack, Rewind Video, Valley Plaza, Pizza Palace, Dairy Dream and Tex Outpost. Also on the strip: the Valley Thriftway supermarket, Hollow Auto Repair, Cascade Tire & Lube, Big Timber Towing (impound lot), Bob's Used Cars, Riverside Body Shop, Fire Station 2 and Valley Feed & Seed. The Timberline Truck Stop, the Cascade Inn motel and Clucker's sit near Exit 64. |
| **Silver Valley Medical Center** | A hospital with an ER, ambulance bay and rooftop helipad. |
| **Maple Grove** | A post-war suburb: a collector boulevard, Birch Loop and six cul-de-sacs of ranches, split-levels, Cape Cods, colonials and 1990s two-storeys. Maple Grove Elementary and Maple Grove Park (ballfield and playground) are here too. |
| **Eastgate** | A newer 1990s subdivision next to the hospital. |
| **Riverside Mobile Home Park** | Single- and double-wides on a loop lane between the strip and the river. |
| **Spirit Lake** | Lakeshore Dr loops the lake past cabins with private docks, lakefront estates, Spirit Lake Lodge, the marina, a bait shop and the campground. |
| **Industrial Flats** | Cascade Lumber mill (tepee burner, log decks), Public Works yard, Cascade Freight Lines, Valley Ready-Mix & Gravel, Ridge Machine & Welding, the lumber yard, the County Road Dept. and Substation 4 with its high-voltage lines. |
| **North Slope** | Sierra Silver Mine (headframe, hoist house, ore bins, portal) and the KPHR radio transmitter. |
| **West Valley / East Valley** | Miller Dairy, Ridgeview Farm, the Grange hall, the Forest Service station, homesteads on Cougar Creek Rd and log cabins up Elk Ridge Rd in the west. Sunny Acres Orchard and Hansen Farm in the east. |

**Town map.** Press `M` while driving. The map is hill-shaded and shows district outlines and names, every named place (colour-coded by type), street names, I-90 shields and exits, a legend and a scale bar. The HUD shows the street and district you're in.

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
npm run dev        # http://localhost:5173  (building gallery: /gallery.html?set=houses|strip|civic|town&only=id1,id2)
npm run build      # static build in dist/
```

URL options:
- `?shot=<id>`: main, courthouse, cityhall, bridge, strip, downtown, oldtown, cedarridge, lake, valley, maplegrove, hospital, trailer, river, school, industrial, mill, mine, interchange, cemetery, lodge, dairy.
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
- **`src/world/plan/`:** the town plan.
  - `roads.ts`: every street, the downtown/Old Town grid and the I-90 diamond interchanges.
  - `zones.ts`: the district builders and the flattened job-site pads.
  - `districts.ts`: named district outlines for the HUD and the map.
  - `placer.ts`: places buildings along road frontage and around cul-de-sacs, with free-space and slope checks, foundations, driveways, mailboxes and parked cars.
- **`src/world/buildings/`:** procedural building catalogs.
  - `houses.ts`: 20 seed-varied home styles, from Victorians, cottages and bungalows to split-levels, ranches with garages, 1990s two-storeys, townhouse rows, duplexes, log cabins, lake cottages, farmhouses, single- and double-wide mobile homes, and lodge and colonial estates.
  - `town.ts`: services and workplaces, including the hospital, schools and football field, supermarket, garages, tow yard, public works, freight depot, truck stop, ready-mix plant, mine, radio station, lodge, campground, depot, brewery, cemetery, park, halls and offices.
  - `strip90s.ts`: 1990s highway businesses.
  - `civic2.ts`: the courthouse.
  - The earlier downtown and commercial builders.
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

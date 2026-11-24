import { RoadNetwork, type RoadDef, type RoadKind } from '../roads/network';

/**
 * Pine Hollow town plan. Coordinates in metres: x east, z south.
 *
 * A compact lakeside grid: Highway 10 comes down the valley and becomes Main Street (z = 0) for eight blocks.
 * Five streets run east-west between the river (north) and Spirit Lake (south), crossed by nine avenues 90 m
 * apart. The commercial core is the four blocks around Main and Division; houses fill the outer blocks; the
 * lake front is Lakeshore Dr. Outside the grid: farms across the river and along the highway, the lumber yard
 * in the western woods, and the freight and container yards at the east end.
 */

/** Street centre lines (z), north to south. */
export const STREETS = { river: -90, main: 0, alder: 90, maple: 180, shore: 270 };
const Z = STREETS;

/** Avenue centre lines (x), west to east. */
export const AVENUES: [string, number][] = [
  ['4th Ave W', -360],
  ['3rd Ave W', -270],
  ['2nd Ave W', -180],
  ['1st Ave W', -90],
  ['Division St', 0],
  ['1st Ave E', 90],
  ['2nd Ave E', 180],
  ['3rd Ave E', 270],
  ['4th Ave E', 360],
];
export const GRID = { x0: -360, x1: 360, z0: Z.river, z1: Z.shore, step: 90 };

const street = (name: string, kind: RoadKind, z: number, x0: number, x1: number, label?: string): RoadDef => ({ name, kind, pts: [[x0, z], [x1, z]], label });
const col = (x: number, ...zs: number[]): [number, number][] => zs.map((z) => [x, z]);

function avenues(): RoadDef[] {
  const out: RoadDef[] = [];
  for (const [name, x] of AVENUES) {
    const core = Math.abs(x) <= 90;
    if (core) {
      // the wide, kerbed downtown section between River St and Alder St, ordinary street beyond
      out.push({ name, kind: 'downtown', pts: col(x, Z.river, Z.main, Z.alder) });
      out.push({ name: `${name} S`, label: name, kind: 'residential', pts: col(x, Z.alder, Z.maple, Z.shore) });
    } else {
      out.push({ name, kind: 'residential', pts: col(x, Z.river, Z.main, Z.alder, Z.maple, Z.shore) });
    }
  }
  return out;
}

/** Every road in Pine Hollow. */
export const ROADS: RoadDef[] = [
  // ---------------------------------------------------------------- Highway 10 = Main Street through town
  { name: 'Old Hwy 10 W', label: 'Highway 10', kind: 'arterial', pts: [[-1845, 40], [-1500, 30], [-1200, 15], [-950, 5], [-760, 0], [-560, 0], [-360, 0]] },
  street('Main St', 'downtown', Z.main, -360, 360),
  { name: 'Old Hwy 10 E', label: 'Highway 10', kind: 'arterial', pts: [[360, 0], [520, 0], [700, 0], [820, 2], [900, 5], [1000, 10], [1150, 20], [1400, 10], [1650, -10], [1845, -30]] },

  // ---------------------------------------------------------------- the grid
  street('River St', 'collector', Z.river, -360, 360),
  street('Alder St', 'collector', Z.alder, -360, 360),
  street('Maple St', 'residential', Z.maple, -360, 360),
  street('Lakeshore Dr', 'collector', Z.shore, -360, 360),
  ...avenues(),

  // ---------------------------------------------------------------- lake front, beyond the grid
  { name: 'Lakeshore Dr W', label: 'Lakeshore Dr', kind: 'rural', pts: [[-360, Z.shore], [-440, 275], [-520, 300], [-590, 350], [-640, 420]], culdesac: true },
  { name: 'Lakeshore Dr E', label: 'Lakeshore Dr', kind: 'rural', pts: [[360, Z.shore], [440, 268], [520, 255]] },

  // ---------------------------------------------------------------- north over the river: farm country
  { name: 'County Rd 5', kind: 'rural', pts: [[0, Z.river], [0, -160], [0, -240], [4, -340], [0, -430], [-6, -520], [0, -610]], culdesac: true },
  { name: 'Orchard Rd', kind: 'gravel', pts: [[0, -340], [140, -336], [300, -345], [460, -340], [600, -330]], culdesac: true },
  { name: 'Hansen Rd', kind: 'gravel', pts: [[0, -430], [-150, -436], [-320, -428], [-480, -420], [-620, -400]], culdesac: true },

  // ---------------------------------------------------------------- west: motel row, fairground, lumber yard
  { name: 'Mill Rd', kind: 'rural', pts: [[-760, 0], [-770, 90], [-800, 180], [-850, 260], [-900, 330]], culdesac: true },
  { name: 'Fairground Rd', kind: 'gravel', pts: [[-560, 0], [-560, -70], [-565, -130]], culdesac: true },
  { name: 'Miller Dairy Rd', kind: 'gravel', pts: [[-1450, 27.5], [-1450, 70], [-1450, 130]], culdesac: true },
  { name: 'Ridgeview Ln', kind: 'gravel', pts: [[-1200, 15], [-1200, -60], [-1198, -140]], culdesac: true },
  { name: 'Cougar Creek Rd', kind: 'gravel', pts: [[-1050, 9], [-1060, 120], [-1090, 230], [-1070, 330]], culdesac: true },

  // ---------------------------------------------------------------- east: freight yard, container yard, farms beyond the bridge
  { name: 'Cannery Rd', kind: 'rural', pts: [[520, 0], [520, 90], [520, 180], [520, 255], [530, 330], [560, 390]], culdesac: true },
  { name: 'Freight Rd', kind: 'rural', pts: [[520, 90], [620, 90], [720, 92], [800, 100]], culdesac: true },
  { name: 'Depot Rd', kind: 'rural', pts: [[520, 0], [520, -60], [524, -110]], culdesac: true },
  { name: 'Eastside Rd', kind: 'gravel', pts: [[1150, 20], [1152, -100], [1150, -220], [1140, -330]], culdesac: true },
  { name: 'Homestead Rd', kind: 'gravel', pts: [[1400, 10], [1402, 110], [1400, 230]], culdesac: true },
];

export function buildNetwork(): RoadNetwork {
  const net = new RoadNetwork();
  for (const d of ROADS) net.add(d);
  net.finalize();
  return net;
}

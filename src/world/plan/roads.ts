import { RoadNetwork, type RoadDef, type RoadKind } from '../roads/network';

/**
 * Pine Hollow town plan. Coordinates in metres: x east, z south.
 *
 * Highway 10 winds down the valley, widens into a commercial strip (W Main) and narrows again into four kerbed
 * downtown blocks of Main Street, which bends at every avenue so no block is square. Around that core the streets step down in rank: Division St, Riverside Dr,
 * Alder St and Lakeshore Dr collect; the avenues and Maple St are ordinary residential streets that bend, stop
 * short or end in a T; service alleys run behind the shop rows. Outside it: Cedar Ridge (the view lots on the
 * hill above the lake), the Flats by the cannery, the Whispering Pines trailer court off Fairground Rd, the
 * freight and container yards, the lumber yard in the western woods and the farms across the river.
 */

type Pt = [number, number];

/**
 * Downtown is not a grid. Main Street bows south round the square and back, turning at every avenue; the avenues
 * stand roughly square to it, so they fan out toward the lake; Riverside Dr and Alder St wander behind. Every block
 * is a different wedge: none has parallel sides, and no two share a width or depth. MAIN lists Main Street's junctions with 2nd Ave W, 1st Ave W, Division St, 1st Ave E, 2nd Ave E.
 */
export const MAIN: Pt[] = [[-200, 0], [-120, 16], [0, 26], [88, 16], [200, -8]];
/** How far each avenue leans east per metre travelled south. */
const LEAN = [0.05, -0.15, 0, 0.17, -0.06];
/** Where each avenue meets Riverside Dr (north) and Alder St (south). */
const NORTH_Z = [-88, -97, -84, -92, -80];
const SOUTH_Z = [84, 96, 104, 93, 84];
const aveAt = (i: number, z: number): Pt => [+(MAIN[i][0] + LEAN[i] * (z - MAIN[i][1])).toFixed(2), z];
export const AVE_N: Pt[] = MAIN.map((_, i) => aveAt(i, NORTH_Z[i]));
export const AVE_S: Pt[] = MAIN.map((_, i) => aveAt(i, SOUTH_Z[i]));
/** Service alleys run this far behind Main Street's centre line. */
export const ALLEY = 37;
/** The bank's customer lot takes this much of the NE block's Main Street frontage, measured from 1st Ave E. */
export const BANK_LOT = 34;

/** Main Street: straight along each block face, turning inside the junctions. */
const mainPts = (): Pt[] => {
  const out: Pt[] = [];
  MAIN.forEach((j, i) => {
    if (i > 0) out.push(toward(j, MAIN[i - 1], 8));
    out.push(j);
    if (i < MAIN.length - 1) out.push(toward(j, MAIN[i + 1], 8));
  });
  return out;
};
function toward(a: Pt, b: Pt, d: number): Pt {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l];
}

/** One block face of Main Street: block i (between avenues i and i + 1), south (+1) or north (-1) side. */
export function face(i: number, side: 1 | -1) {
  const [a, b] = side > 0 ? [MAIN[i], MAIN[i + 1]] : [MAIN[i + 1], MAIN[i]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uz = (b[1] - a[1]) / len;
  // local x runs along the face from avenue `left`, local z into the block
  return { x: a[0], z: a[1], ry: Math.atan2(-uz, ux), len, ux, uz, nx: -uz, nz: ux, left: side > 0 ? i : i + 1, right: side > 0 ? i + 1 : i };
}

/** The alley behind a block face, from its left avenue to its right one (or only as far as `to` metres along the face). */
function alley(i: number, side: 1 | -1, to?: number): Pt[] {
  const f = face(i, side);
  const hit = (k: number): Pt => {
    // offset line P = a + u t + n ALLEY meets avenue k: x = MAIN[k].x + LEAN[k] (z - MAIN[k].z)
    const ox = f.x + f.nx * ALLEY;
    const oz = f.z + f.nz * ALLEY;
    const t = (MAIN[k][0] + LEAN[k] * (oz - MAIN[k][1]) - ox) / (f.ux - LEAN[k] * f.uz);
    return [ox + f.ux * t, oz + f.uz * t];
  };
  return [hit(f.left), to === undefined ? hit(f.right) : [f.x + f.ux * to + f.nx * ALLEY, f.z + f.uz * to + f.nz * ALLEY]];
}

/** Every road in Pine Hollow. */
export const ROADS: RoadDef[] = [
  // ---------------------------------------------------------------- Highway 10 -> the strip -> Main Street
  { name: 'Old Hwy 10 W', label: 'Highway 10', kind: 'arterial', pts: [[-1845, 40], [-1500, 30], [-1200, 15], [-1050, 9], [-950, 5], [-760, 0], [-640, 3], [-560, 6], [-500, 10], [-420, 12]] },
  { name: 'W Main St', label: 'Main St', kind: 'strip', pts: [[-420, 12], [-330, 7], [-260, 2], MAIN[0]] },
  { name: 'Main St', kind: 'downtown', pts: mainPts() },
  { name: 'E Main St', label: 'Main St', kind: 'collector', pts: [MAIN[4], [300, -14], [360, -9], [420, 0]] },
  { name: 'Old Hwy 10 E', label: 'Highway 10', kind: 'arterial', pts: [[420, 0], [520, 0], [700, 0], [820, 2], [900, 5], [1000, 10], [1150, 20], [1400, 10], [1650, -10], [1845, -30]] },

  // ---------------------------------------------------------------- collectors
  { name: 'Division St', kind: 'downtown', pts: [AVE_N[2], MAIN[2], AVE_S[2]] },
  { name: 'Division St S', label: 'Division St', kind: 'residential', pts: [AVE_S[2], [0, 188], [0, 270]] },
  { name: 'Riverside Dr', kind: 'collector', pts: [[-330, 7], [-334, -30], [-312, -64], [-260, -84], AVE_N[0], AVE_N[1], AVE_N[2], AVE_N[3], AVE_N[4], [280, -74], [336, -52], [360, -9]] },
  { name: 'Alder St', kind: 'collector', pts: [[-260, 2], [-263, 40], [-242, 71], AVE_S[0], AVE_S[1], toward(AVE_S[2], AVE_S[1], 10), AVE_S[2], toward(AVE_S[2], AVE_S[3], 10), AVE_S[3], AVE_S[4], [303, 88]] },
  { name: 'Lakeshore Dr', kind: 'collector', pts: [[-400, 318], [-300, 298], [-200, 282], [-100, 273], [0, 270], [100, 271], [200, 279], [300, 294], [400, 316]] },

  // ---------------------------------------------------------------- avenues: wide through the core, ordinary streets south of Alder
  { name: '1st Ave W', kind: 'collector', pts: [AVE_N[1], MAIN[1], AVE_S[1]] },
  { name: '1st Ave W S', label: '1st Ave W', kind: 'residential', pts: [AVE_S[1], [-112, 142], [-100, 190]] },
  { name: '1st Ave E', kind: 'collector', pts: [AVE_N[3], MAIN[3], AVE_S[3]] },
  { name: '1st Ave E S', label: '1st Ave E', kind: 'residential', pts: [AVE_S[3], [96, 138], [100, 180]] },
  { name: '2nd Ave W', kind: 'residential', pts: [AVE_N[0], MAIN[0], AVE_S[0]] },
  { name: '2nd Ave E', kind: 'residential', pts: [AVE_N[4], MAIN[4], AVE_S[4], [204, 172], [214, 230], [200, 279]] },
  { name: '3rd Ave E', kind: 'residential', pts: [[300, -14], [303, 88], [312, 166], [318, 236], [300, 294]] },
  // Lake Hill Rd drops from the foot of 2nd Ave W to the lake on a long bend; Maple St leaves it and bows toward the shore
  { name: 'Lake Hill Rd', kind: 'residential', pts: [AVE_S[0], [-212, 140], [-246, 200], [-284, 250], [-300, 298]] },
  { name: 'Maple St', kind: 'residential', pts: [[-212, 140], [-170, 172], [-100, 190], [0, 188], [100, 180], [204, 172], [312, 166]] },
  { name: 'Heron Ct', kind: 'residential', pts: [[-100, 190], [-112, 226], [-150, 240]], culdesac: true },
  { name: 'Birch Ct', kind: 'residential', pts: [[100, 180], [108, 222], [84, 244]], culdesac: true },
  // Meadowbrook: the new subdivision going up west of Lake Hill Rd, three courts off one loop-less drive
  { name: 'Meadowbrook Dr', kind: 'suburban', pts: [[-246, 200], [-300, 186], [-330, 179], [-360, 172], [-390, 166], [-420, 160], [-452, 140]], culdesac: true },
  { name: 'Fawn Ct', kind: 'suburban', pts: [[-330, 179], [-338, 140], [-330, 104]], culdesac: true },
  { name: 'Quail Ct', kind: 'suburban', pts: [[-390, 166], [-398, 206], [-388, 244]], culdesac: true },
  { name: 'Sparrow Ct', kind: 'gravel', pts: [[-420, 160], [-428, 120], [-438, 88]], culdesac: true },

  // ---------------------------------------------------------------- service alleys behind the Main Street rows
  ...[0, 1, 2, 3].map((i): RoadDef => ({ name: `Alley S${i}`, label: '', kind: 'alley', pts: alley(i, 1) })),
  { name: 'Alley N0', label: '', kind: 'alley', pts: alley(0, -1) },
  { name: 'Alley N1', label: '', kind: 'alley', pts: alley(1, -1) },
  // behind the bank's own lot the alley starts part-way along the block
  { name: 'Alley N3', label: '', kind: 'alley', pts: alley(3, -1, face(3, -1).len - BANK_LOT) },

  // ---------------------------------------------------------------- lake front, beyond the core
  { name: 'Lakeshore Dr W', label: 'Lakeshore Dr', kind: 'rural', pts: [[-400, 318], [-470, 338], [-540, 356], [-600, 390], [-640, 440]], culdesac: true },
  { name: 'Lakeshore Dr E', label: 'Lakeshore Dr', kind: 'rural', pts: [[400, 316], [460, 298], [520, 255]] },

  // ---------------------------------------------------------------- Cedar Ridge: the view lots on the hill above the lake
  { name: 'Ridgecrest Dr', kind: 'suburban', pts: [[-500, 10], [-506, 80], [-532, 148], [-588, 196], [-648, 212], [-700, 186]], culdesac: true },
  { name: 'Lakeview Ct', kind: 'suburban', pts: [[-588, 196], [-574, 256], [-528, 300]], culdesac: true },

  // ---------------------------------------------------------------- the Flats: cannery workers' streets, no kerbs
  { name: 'Tannery St', kind: 'lane', pts: [[312, 166], [380, 176], [450, 171], [520, 180]] },
  { name: 'Slough Rd', kind: 'gravel', pts: [[318, 236], [370, 246], [440, 252], [482, 290]], culdesac: true },

  // ---------------------------------------------------------------- north over the river: farm country
  { name: 'County Rd 5', kind: 'rural', pts: [AVE_N[2], [0, -160], [0, -240], [4, -340], [0, -430], [-6, -520], [0, -610]], culdesac: true },
  { name: 'Orchard Rd', kind: 'gravel', pts: [[0, -340], [140, -336], [300, -345], [460, -340], [600, -330]], culdesac: true },
  { name: 'Hansen Rd', kind: 'gravel', pts: [[0, -430], [-150, -436], [-320, -428], [-480, -420], [-620, -400]], culdesac: true },

  // ---------------------------------------------------------------- west: trailer court, lumber yard, dairy
  { name: 'Mill Rd', kind: 'rural', pts: [[-760, 0], [-770, 90], [-800, 180], [-850, 260], [-900, 330]], culdesac: true },
  { name: 'Fairground Rd', kind: 'gravel', pts: [[-560, 6], [-560, -50], [-560, -110], [-565, -140]], culdesac: true },
  { name: 'Pine Loop', label: 'Whispering Pines', kind: 'gravel', pts: [[-560, -50], [-512, -46], [-474, -58], [-462, -88], [-480, -114], [-520, -118], [-560, -110]] },
  { name: 'Miller Dairy Rd', kind: 'gravel', pts: [[-1450, 27.5], [-1450, 70], [-1450, 130]], culdesac: true },
  { name: 'Ridgeview Ln', kind: 'gravel', pts: [[-1200, 15], [-1200, -60], [-1198, -140]], culdesac: true },
  { name: 'Cougar Creek Rd', kind: 'gravel', pts: [[-1050, 9], [-1060, 120], [-1090, 230], [-1070, 330]], culdesac: true },

  // ---------------------------------------------------------------- east: freight yard, container yard, farms beyond the bridge
  { name: 'Cannery Rd', kind: 'rural', pts: [[520, 0], [520, 90], [520, 180], [520, 255], [530, 330], [560, 390]], culdesac: true },
  { name: 'Freight Rd', kind: 'rural', pts: [[520, 90], [620, 90], [720, 92], [800, 100]], culdesac: true },
  { name: 'Depot Rd', kind: 'rural', pts: [[520, 0], [520, -60], [524, -110]], culdesac: true },
  { name: 'Eastside Rd', kind: 'gravel', pts: [[1150, 20], [1152, -100], [1150, -220], [1140, -330]], culdesac: true },
  // Sunset Acres: a mobile-home park out on the highway past the last farm, ten minutes from town
  { name: 'Sunset Loop', label: 'Sunset Acres', kind: 'gravel', pts: [[1600, -6], [1596, 50], [1612, 96], [1652, 120], [1700, 108], [1720, 60], [1704, 10], [1690, -17]] },
  { name: 'Homestead Rd', kind: 'gravel', pts: [[1400, 10], [1402, 110], [1400, 230]], culdesac: true },
];

export function buildNetwork(): RoadNetwork {
  const net = new RoadNetwork();
  for (const d of ROADS) net.add(d);
  net.finalize();
  return net;
}

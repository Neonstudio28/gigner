import { RoadNetwork, type RoadDef, type RoadKind } from '../roads/network';
import { smoothstep } from '../core/rng';

/**
 * Pine Hollow town plan. Coordinates in metres: x east, z south; Main St runs along z = 0 and the
 * courthouse square sits just north of it at the centre of town.
 *
 * The layout follows small interstate towns of the inland Northwest (Cle Elum WA, Kellogg ID):
 * the old highway (Old Hwy 10) is Main Street through the middle of town and links two I-90
 * interchanges, one at each end. Downtown is a few blocks of Main plus the cross streets around the
 * courthouse square, with the civic row on Alder St. The South Fork runs just north of downtown
 * with parks on both banks (like Leavenworth's Waterfront Park); the North Side lies across the
 * bridges. Grid streets run on out of the grid and bend into the newer neighbourhoods, ending in
 * cul-de-sacs. Schools and their fields sit at the west and east ends of town.
 */

// ---------------------------------------------------------------- I-90
const I90: [number, number][] = [
  [-1845, -360],
  [-1550, -380],
  [-1250, -420],
  [-1000, -455],
  [-760, -474],
  [-400, -485],
  [0, -485],
  [400, -485],
  [760, -474],
  [1050, -445],
  [1350, -410],
  [1600, -395],
  [1845, -390],
];

/** I-90 centre line z at x (piecewise linear; the spline passes through these points). */
export function i90z(x: number) {
  if (x <= I90[0][0]) return I90[0][1];
  for (let i = 0; i < I90.length - 1; i++) {
    const [ax, az] = I90[i];
    const [bx, bz] = I90[i + 1];
    if (x <= bx) return az + ((x - ax) / (bx - ax)) * (bz - az);
  }
  return I90[I90.length - 1][1];
}

/** The two interchanges; I-90 rises onto a short overpass so the crossroad passes underneath. */
export const EXITS = [
  { n: 61, x: -760, road: 'Mill Rd', to: 'Pine Hollow West · Mill Rd' },
  { n: 63, x: 760, road: 'Eastside Rd', to: 'Downtown · Spirit Lake · Hospital' },
];
const DECK = 7.5;
const interstateElev = (x: number) => {
  let e = 0;
  for (const ex of EXITS) e = Math.max(e, smoothstep(ex.x - 160, ex.x - 60, x) * (1 - smoothstep(ex.x + 60, ex.x + 160, x)));
  return e * DECK;
};

/** Four ramps of a diamond interchange at crossroad x0 (EB = south side, WB = north side). */
function diamond(n: number, x0: number): RoadDef[] {
  const P = (dx: number, off: number): [number, number] => [x0 + dx, i90z(x0 + dx) + off];
  const ramp = (name: string, pts: [number, number][]): RoadDef => ({ name: `Exit ${n} ${name}`, kind: 'ramp', link: true, pts, label: '' });
  return [
    ramp('EB off', [P(-235, 8.5), P(-170, 11), P(-100, 22), P(-50, 40), P(-4, 62)]),
    ramp('EB on', [P(4, 70), P(50, 44), P(110, 22), P(170, 11), P(235, 8.5)]),
    ramp('WB off', [P(235, -8.5), P(170, -11), P(100, -22), P(50, -40), P(4, -62)]),
    ramp('WB on', [P(-4, -70), P(-50, -44), P(-110, -22), P(-170, -11), P(-235, -8.5)]),
  ];
}

// ---------------------------------------------------------------- the grid
/** Street centre lines (z). River St runs along the south bank; the North Side streets lie across the river. */
export const STREETS = { riverside: -245, spruce: -330, larch: -405, river: -90, main: 0, alder: 90, maple: 180 };
const Z = STREETS;
/** Avenue centre lines (x) south of the river; Division St is the town's north–south axis. */
export const AVENUES: [string, number][] = [
  ['5th Ave W', -500],
  ['4th Ave W', -400],
  ['3rd Ave W', -300],
  ['2nd Ave W', -200],
  ['1st Ave W', -100],
  ['Division St', 0],
  ['1st Ave E', 100],
  ['2nd Ave E', 200],
  ['3rd Ave E', 300],
  ['4th Ave E', 400],
  ['5th Ave E', 500],
];

const street = (name: string, kind: RoadKind, z: number, x0: number, x1: number, label?: string): RoadDef => ({ name, kind, pts: [[x0, z], [x1, z]], label });
const alley = (name: string, z: number, x0: number, x1: number): RoadDef => ({ name, kind: 'alley', pts: [[x0, z], [x1, z]], label: '' });
const col = (x: number, ...zs: number[]): [number, number][] => zs.map((z) => [x, z]);

/** Avenues south of the river: wide downtown sections near Main St, tree-lined beyond, some running on into the hills. */
function avenues(): RoadDef[] {
  const out: RoadDef[] = [];
  // downtown avenues (River St → Alder St); the grid ends at Maple St, where the hillside begins
  for (const s of [-1, 1]) {
    const e = s > 0 ? 'E' : 'W';
    out.push({ name: `1st Ave ${e}`, kind: 'downtown', pts: col(s * 100, Z.river, Z.main, Z.alder) });
    out.push({ name: `1st Ave ${e} S`, label: `1st Ave ${e}`, kind: 'residential', pts: col(s * 100, Z.alder, Z.maple) });
    out.push({ name: `2nd Ave ${e}`, kind: 'downtown', pts: col(s * 200, Z.river, Z.main, Z.alder) });
    out.push({ name: `4th Ave ${e}`, kind: 'residential', pts: col(s * 400, Z.river, Z.main, Z.alder, Z.maple) });
  }
  // 2nd Ave W climbs Church Hill to the cemetery; 2nd Ave E climbs Cedar Ridge
  out.push({ name: '2nd Ave W S', label: '2nd Ave W', kind: 'residential', pts: [...col(-200, Z.alder, Z.maple), [-205, 250], [-225, 320], [-265, 380], [-320, 420]], culdesac: true });
  out.push({ name: '2nd Ave E S', label: '2nd Ave E', kind: 'residential', pts: [...col(200, Z.alder, Z.maple), [205, 262], [230, 330], [280, 390], [330, 420]], culdesac: true });
  // Division St: past the courthouse square, through the shops, then winding up Cedar Ridge
  out.push({ name: 'Division St', kind: 'downtown', pts: col(0, Z.main, Z.alder) });
  out.push({ name: 'Division St S', label: 'Division St', kind: 'residential', pts: [...col(0, Z.alder, Z.maple), [2, 257], [-20, 320], [0, 380], [60, 430], [90, 480]], culdesac: true });
  // ...and north over the river bridge to the North Side
  out.push({ name: 'Division St N', label: 'Division St', kind: 'residential', pts: col(0, Z.river, -160, Z.riverside, Z.spruce, Z.larch) });
  // 3rd Ave W is the second river bridge; 3rd Ave E stops at Maple St
  out.push({ name: '3rd Ave W', kind: 'residential', pts: col(-300, Z.larch, Z.spruce, Z.riverside, -160, Z.river, Z.main, Z.alder, Z.maple) });
  out.push({ name: '3rd Ave E', kind: 'residential', pts: col(300, Z.river, Z.main, Z.alder, Z.maple) });
  // 5th Ave W runs on round the west side of Church Hill; 5th Ave E runs down to Hillcrest Dr
  out.push({ name: '5th Ave W', kind: 'residential', pts: [[-500, -88], ...col(-500, Z.main, Z.alder, Z.maple), [-505, 250], [-530, 320], [-580, 375], [-650, 405]], culdesac: true });
  out.push({ name: '5th Ave E', kind: 'residential', pts: [[500, -88], ...col(500, Z.main, Z.alder, Z.maple), [496, 259]] });
  // North Side avenues (Riverside Dr → Larch St)
  for (const [label, x] of [['4th Ave W', -400], ['2nd Ave W', -200], ['1st Ave W', -100], ['1st Ave E', 100], ['2nd Ave E', 200], ['3rd Ave E', 300], ['4th Ave E', 400]] as [string, number][]) {
    out.push({ name: `N ${label}`, label, kind: 'residential', pts: [[x, Math.abs(x) >= 400 ? -250 : Z.riverside], [x, Z.spruce], [x, Z.larch]] });
  }
  return out;
}

/** Every road in Pine Hollow. */
export const ROADS: RoadDef[] = [
  // ---------------------------------------------------------------- I-90 and its two interchanges
  { name: 'I-90', kind: 'interstate', pts: I90, elev: (x) => interstateElev(x) },
  ...EXITS.flatMap((e) => diamond(e.n, e.x)),

  // ---------------------------------------------------------------- Old Highway 10 = Main Street through town
  { name: 'Old Hwy 10 W', label: 'Old Highway 10', kind: 'arterial', pts: [[-1845, 40], [-1500, 30], [-1200, 15], [-950, 5], [-760, 0], [-620, 0], [-520, 0]] },
  street('Main St', 'downtown', Z.main, -520, 520),
  { name: 'Old Hwy 10 E', label: 'Old Highway 10', kind: 'arterial', pts: [[520, 0], [640, 0], [760, 0], [880, 3], [1000, 10], [1150, 20], [1400, 10], [1650, -10], [1845, -30]] },

  // ---------------------------------------------------------------- interchange crossroads (both bridge the river)
  { name: 'Mill Rd', kind: 'rural', pts: [[-760, 0], [-760, -120], [-760, -240], [-760, -370], [-760, -474], [-760, -560], [-760, -610], [-760, -630]] },
  { name: 'Eastside Rd', kind: 'rural', pts: [[760, 0], [760, -130], [760, -250], [760, -370], [760, -474], [760, -560], [760, -610], [760, -630]] },
  { name: 'Mine Rd', kind: 'dirt', pts: [[-760, -610], [-820, -622], [-870, -640]], culdesac: true },
  { name: 'Lookout Rd', kind: 'gravel', pts: [[760, -610], [830, -640], [900, -670]], culdesac: true },

  // ---------------------------------------------------------------- downtown: River St, Alder St civic row, alleys
  { name: 'River St', kind: 'residential', pts: [[-600, 0], [-575, -55], [-520, -86], [-450, Z.river], [450, Z.river], [520, -86], [575, -55], [600, 0]] },
  street('Alder St', 'downtown', Z.alder, -300, 300),
  alley('Main Alley', 45, -296, 296),
  ...avenues(),

  // ---------------------------------------------------------------- Old Town (south of Main St)
  { name: 'Alder St W', label: 'Alder St', kind: 'residential', pts: [[-300, Z.alder], [-500, Z.alder], [-700, Z.alder], [-780, 110], [-840, 170], [-850, 250]], culdesac: true },
  street('Alder St E', 'residential', Z.alder, 300, 500, 'Alder St'),
  street('Maple St', 'residential', Z.maple, -500, 500),
  alley('Alder Alley W', 135, -496, -304),
  alley('Alder Alley E', 135, 304, 496),

  // ---------------------------------------------------------------- the south hillside: Church Hill and Cedar Ridge
  // Hillcrest Dr follows the foot of the hills from 5th Ave W across to Eastgate; the avenues cross it and wind on up
  {
    name: 'Hillcrest Dr',
    kind: 'residential',
    pts: [[-505, 250], [-400, 262], [-300, 250], [-205, 250], [-120, 262], [-40, 252], [40, 262], [120, 250], [205, 262], [300, 250], [400, 238], [480, 250], [560, 300], [650, 325], [740, 320], [800, 290], [830, 232]],
    culdesac: true,
  },
  { name: 'Laurel Ln', kind: 'suburban', pts: [[-225, 320], [-150, 335], [-80, 330], [-20, 320]] },
  { name: 'Ridgecrest Dr', kind: 'suburban', pts: [[0, 380], [100, 402], [200, 398], [280, 390], [380, 368], [455, 338], [488, 298], [480, 250]] },
  { name: 'Overlook Ct', kind: 'suburban', pts: [[60, 430], [130, 450], [190, 490]], culdesac: true },
  { name: 'Summit Ct', kind: 'suburban', pts: [[380, 368], [400, 430], [380, 480]], culdesac: true },
  { name: 'Madrona Ct', kind: 'suburban', pts: [[120, 250], [130, 300], [160, 340]], culdesac: true },
  { name: 'Aspen Ct', kind: 'suburban', pts: [[300, 250], [315, 295], [325, 325]], culdesac: true },
  { name: 'Sunrise Ct', kind: 'suburban', pts: [[-150, 335], [-150, 400], [-120, 450]], culdesac: true },
  { name: 'Hilltop Ct', kind: 'suburban', pts: [[-530, 320], [-460, 330], [-430, 365]], culdesac: true },
  { name: 'Chapel Ct', kind: 'suburban', pts: [[-265, 380], [-325, 364], [-382, 350]], culdesac: true },

  // ---------------------------------------------------------------- North Side (across the river)
  { name: 'Larch St', kind: 'residential', pts: [[-560, -357], [-520, -395], [-440, Z.larch], [440, Z.larch], [520, -420], [560, -425]], culdesac: true },
  { name: 'Riverside Dr', kind: 'residential', pts: [[-470, -401.25], [-480, -330], [-445, -262], [-380, Z.riverside], [380, Z.riverside], [445, -262], [480, -330], [470, -410.6]] },
  street('Spruce St', 'residential', Z.spruce, -480, 480),
  alley('North Alley 1', -287.5, -395, 395),
  alley('North Alley 2', -367.5, -395, 395),

  // ---------------------------------------------------------------- west end: industry, mobile homes, the West End suburb
  { name: 'Industrial Way', kind: 'rural', pts: [[-760, -370], [-680, -366], [-620, -362], [-560, -357]] },
  { name: 'Mill Spur', kind: 'gravel', pts: [[-1000, 7], [-1000, -90], [-1000, -190]] },
  { name: 'Riverside Ln', kind: 'lane', pts: [[-735, 0], [-735, -70], [-710, -140], [-660, -150], [-640, -90], [-650, 0]] },
  { name: 'Sunset Dr', kind: 'suburban', pts: [[-780, 110], [-760, 180], [-745, 255], [-705, 300]], culdesac: true },
  { name: 'Hemlock Ct', kind: 'suburban', pts: [[-840, 170], [-905, 190], [-950, 235]], culdesac: true },

  // ---------------------------------------------------------------- Eastgate (beyond the high school)
  { name: 'Elm Ct', kind: 'suburban', pts: [[650, 325], [662, 390], [645, 445]], culdesac: true },
  { name: 'Tamarack Ct', kind: 'suburban', pts: [[740, 320], [775, 385], [790, 440]], culdesac: true },

  // ---------------------------------------------------------------- Spirit Lake (Lakeshore Dr loops the lake, both ends on Old Hwy 10)
  {
    name: 'Lakeshore Dr',
    kind: 'rural',
    pts: [[880, 3], [878, 120], [885, 250], [880, 360], [920, 450], [1020, 520], [1180, 545], [1320, 520], [1440, 450], [1500, 340], [1495, 220], [1460, 110], [1420, 40], [1400, 10]],
  },

  // ---------------------------------------------------------------- rural west and east
  { name: 'Miller Dairy Rd', kind: 'gravel', pts: [[-1450, 27.5], [-1450, 70], [-1450, 112]] },
  { name: 'Ridgeview Ln', kind: 'gravel', pts: [[-1200, 15], [-1200, 70], [-1198, 125]] },
  { name: 'Cougar Creek Rd', kind: 'gravel', pts: [[-1050, 9], [-1060, 120], [-1090, 230], [-1070, 330], [-1030, 400]], culdesac: true },
  { name: 'Grouse Ln', kind: 'dirt', pts: [[-1070, 330], [-1180, 380], [-1300, 420]], culdesac: true },
  { name: 'Orchard Rd', kind: 'gravel', pts: [[1600, -6], [1602, 100], [1600, 215]], culdesac: true },
  { name: 'Hansen Rd', kind: 'gravel', pts: [[1600, -6], [1598, -120], [1595, -247]] },
];

export function buildNetwork(): RoadNetwork {
  const net = new RoadNetwork();
  for (const d of ROADS) net.add(d);
  net.finalize();
  return net;
}

export { interstateElev };

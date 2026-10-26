import { RoadNetwork, type RoadDef, type RoadKind } from '../roads/network';
import { smoothstep } from '../core/rng';

/**
 * Pine Hollow town plan. Coordinates in metres: x east, z south; the courthouse square is at (0, -165).
 *
 * Layout (north to south): I-90 along the foot of the northern slopes with three diamond interchanges,
 * the South Fork river, the riverfront, the Main Street grid around Courthouse Square, Old Town's
 * alley-backed residential grid, then the hillside streets of Church Hill and Cedar Ridge. Maple Grove
 * (post-war curvilinear suburb) lies west, the highway strip and Spirit Lake east, farms at both ends.
 */

// ---------------------------------------------------------------- I-90
const I90: [number, number][] = [
  [-1845, -480],
  [-1600, -525],
  [-1300, -560],
  [-900, -575],
  [-450, -578],
  [0, -575],
  [450, -578],
  [900, -575],
  [1250, -560],
  [1550, -525],
  [1845, -480],
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

/** Interchange crossroads: I-90 rises onto a short overpass so the crossroad passes underneath. */
export const EXITS = [
  { n: 60, x: -900, road: 'Mill Rd', to: 'Mill Rd · Maple Grove' },
  { n: 62, x: 0, road: 'Bridge St', to: 'Downtown Pine Hollow' },
  { n: 64, x: 1250, road: 'Spirit Lake Rd', to: 'Spirit Lake · Hospital' },
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

// ---------------------------------------------------------------- downtown / Old Town grid
/** Avenue centre lines (x). 1st Ave W/E bound Courthouse Square. */
export const AVENUES: [string, number][] = [
  ['4th Ave W', -360],
  ['3rd Ave W', -260],
  ['2nd Ave W', -160],
  ['1st Ave W', -70],
  ['1st Ave E', 70],
  ['2nd Ave E', 160],
  ['3rd Ave E', 260],
  ['4th Ave E', 360],
];
/** Street centre lines (z), north to south. */
export const STREETS = { river: -270, main: -210, court: -120, pine: -40, cedar: 40, alder: 115, hemlock: 190 };
const Z = STREETS;

function avenues(): RoadDef[] {
  const out: RoadDef[] = [];
  for (const [name, x] of AVENUES) {
    if (Math.abs(x) > 300) {
      // 4th Aves: residential all the way; 4th Ave W runs on up Church Hill to a turnaround
      const south = x < 0 ? 300 : Z.hemlock;
      out.push({ name, kind: 'residential', pts: [[x, Z.river], [x, Z.main], [x, Z.court], [x, Z.pine], [x, Z.cedar], [x, Z.alder], [x, Z.hemlock], ...(x < 0 ? ([[x, 250], [x, south]] as [number, number][]) : [])], culdesac: x < 0 });
      continue;
    }
    // downtown section (wide sidewalks, parking) then the tree-lined Old Town section
    out.push({ name, kind: 'downtown', pts: [[x, Z.river], [x, Z.main], [x, Z.court]] });
    out.push({ name: `${name} S`, label: name, kind: 'residential', pts: [[x, Z.court], [x, Z.pine], [x, Z.cedar], [x, Z.alder], [x, Z.hemlock]] });
  }
  return out;
}

const street = (name: string, kind: RoadKind, z: number, x0: number, x1: number): RoadDef => ({ name, kind, pts: [[x0, z], [x1, z]] });
const alley = (name: string, z: number, x0: number, x1: number): RoadDef => ({ name, kind: 'alley', pts: [[x0, z], [x1, z]], label: '' });

/** Every road in Pine Hollow. */
export const ROADS: RoadDef[] = [
  // ---------------------------------------------------------------- I-90 and its interchanges
  { name: 'I-90', kind: 'interstate', pts: I90, elev: (x) => interstateElev(x), noBridge: true },
  ...EXITS.flatMap((e) => diamond(e.n, e.x)),

  // ---------------------------------------------------------------- Old Highway 10: west → Main St → Front St strip → east
  { name: 'Old Hwy 10 W', label: 'Old Highway 10', kind: 'arterial', pts: [[-1845, -232], [-1600, -240], [-1350, -248], [-1100, -252], [-900, -255], [-700, -247], [-560, -232], [-470, -216], [-420, -210]] },
  street('Main St', 'downtown', Z.main, -420, 420),
  { name: 'Front St', kind: 'strip', pts: [[420, -210], [560, -211], [700, -203], [860, -188], [1000, -186], [1180, -190]] },
  { name: 'Old Hwy 10 E', label: 'Old Highway 10', kind: 'arterial', pts: [[1180, -190], [1250, -192], [1400, -200], [1600, -222], [1845, -262]] },

  // ---------------------------------------------------------------- interchange crossroads
  { name: 'Mill Rd', kind: 'rural', pts: [[-900, -255], [-900, -330], [-900, -420], [-900, -520], [-900, -575], [-900, -640], [-900, -688], [-900, -704]] },
  { name: 'Bridge St', kind: 'arterial', pts: [[0, Z.main], [0, Z.river], [0, -346], [0, -440], [0, -575], [0, -640], [0, -688], [0, -704]] },
  { name: 'Spirit Lake Rd', kind: 'rural', pts: [[1250, -690], [1250, -560], [1250, -400], [1250, -192], [1256, -90], [1290, 20], [1350, 110]] },

  // ---------------------------------------------------------------- north side: industry, mine, radio
  { name: 'Industrial Way', kind: 'rural', pts: [[-955, -460], [-900, -458], [-800, -455], [-650, -456], [-480, -458], [-420, -460]], culdesac: true },
  { name: 'Mine Rd', kind: 'dirt', pts: [[-900, -688], [-830, -692], [-760, -695], [-690, -692]], culdesac: true },
  { name: 'Lookout Rd', kind: 'gravel', pts: [[0, -688], [50, -700], [120, -712], [190, -722]], culdesac: true },

  // ---------------------------------------------------------------- downtown grid around Courthouse Square
  { name: 'River St', kind: 'residential', pts: [[-500, -221.3], [-450, -262], [-400, -270], [400, -270], [450, -262], [500, -210.6]] },
  street('Court St', 'downtown', Z.court, -360, 360),
  alley('Main Alley W', -165, -356, -74),
  alley('Main Alley E', -165, 74, 356),
  ...avenues(),

  // ---------------------------------------------------------------- Old Town (alley-backed residential grid)
  street('Pine St', 'residential', Z.pine, -360, 662),
  street('Cedar St', 'residential', Z.cedar, -360, 672),
  street('Alder St', 'residential', Z.alder, -360, 360),
  street('Hemlock St', 'residential', Z.hemlock, -360, 694),
  alley('Pine Alley', 0, -356, 356),
  alley('Cedar Alley', 77.5, -356, 356),
  alley('Alder Alley', 152.5, -356, 356),

  // ---------------------------------------------------------------- Church Hill (hillside streets and the cemetery)
  { name: 'Hillside Dr', kind: 'residential', pts: [[-70, Z.hemlock], [-75, 235], [-120, 280], [-200, 305], [-290, 298], [-360, 262]] },
  { name: 'Church Hill Rd', kind: 'residential', pts: [[-200, 305], [-212, 355], [-228, 400]], culdesac: true },

  // ---------------------------------------------------------------- Cedar Ridge (view lots on the hill above Old Town)
  { name: 'Ridgecrest Dr', kind: 'suburban', pts: [[260, Z.hemlock], [268, 240], [300, 292], [370, 332], [450, 326], [500, 278], [508, 228], [500, Z.hemlock]] },
  { name: 'Summit Ct', kind: 'suburban', pts: [[370, 332], [368, 385], [350, 425]], culdesac: true },
  { name: 'Vista Ct', kind: 'suburban', pts: [[300, 292], [250, 322], [225, 370]], culdesac: true },
  { name: 'Madrona Ln', kind: 'suburban', pts: [[500, 278], [555, 315], [585, 370]], culdesac: true },

  // ---------------------------------------------------------------- Maple Grove (post-war suburb: collector, loop, cul-de-sacs)
  { name: 'Maple Grove Blvd', kind: 'suburban', pts: [[-360, Z.pine], [-480, -42], [-600, -62], [-720, -102], [-820, -152], [-880, -205], [-900, -255]] },
  { name: 'Birch Loop', kind: 'suburban', pts: [[-560, -55.3], [-562, 20], [-600, 95], [-680, 128], [-760, 110], [-802, 40], [-795, -40], [-780, -132]] },
  { name: 'Aspen Ct', kind: 'suburban', pts: [[-600, 95], [-612, 160], [-600, 225]], culdesac: true },
  { name: 'Larch Ct', kind: 'suburban', pts: [[-760, 110], [-800, 168], [-835, 215]], culdesac: true },
  { name: 'Juniper Ct', kind: 'suburban', pts: [[-562, 20], [-515, 38], [-492, 70]], culdesac: true },
  { name: 'Ponderosa Way', kind: 'suburban', pts: [[-802, 40], [-880, 62], [-950, 105], [-995, 170]], culdesac: true },
  { name: 'Fir Ct', kind: 'suburban', pts: [[-880, 62], [-905, 0], [-935, -55]], culdesac: true },
  { name: 'Spruce Ct', kind: 'suburban', pts: [[-680, -88.7], [-672, -140], [-655, -182]], culdesac: true },

  // ---------------------------------------------------------------- east side: strip, mobile home park, Eastgate, hospital
  { name: 'Riverside Ln', kind: 'lane', pts: [[660, -60], [740, -62], [805, -30], [815, 30], [780, 78], [720, 92], [681, 96]] },
  { name: 'Eastgate Dr', kind: 'suburban', pts: [[1256, -90], [1190, -80], [1130, -40], [1105, 25], [1125, 80]], culdesac: true },
  { name: 'Elm Ct', kind: 'suburban', pts: [[1130, -40], [1070, -20], [1020, 15]], culdesac: true },
  { name: 'Tamarack Ct', kind: 'suburban', pts: [[1190, -80], [1202, -10], [1192, 48]], culdesac: true },

  // ---------------------------------------------------------------- Spirit Lake (Lakeshore Dr loops the south shore back to Front St)
  {
    name: 'Lakeshore Dr',
    kind: 'rural',
    pts: [[1350, 110], [1405, 200], [1422, 300], [1398, 410], [1325, 495], [1205, 560], [1060, 580], [915, 562], [800, 502], [728, 400], [702, 280], [690, 150], [672, 40], [660, -60], [652, -130], [650, -206]],
  },

  // ---------------------------------------------------------------- rural west: farms, homesteads, forest cabins
  { name: 'Miller Dairy Rd', kind: 'gravel', pts: [[-1481, -243.8], [-1481, -205], [-1481, -176]] },
  { name: 'Ridgeview Ln', kind: 'gravel', pts: [[-1250, -249.6], [-1250, -200], [-1248, -155]] },
  { name: 'Cougar Creek Rd', kind: 'gravel', pts: [[-1100, -252], [-1105, -160], [-1140, -60], [-1180, 50], [-1160, 170], [-1110, 280], [-1060, 360]], culdesac: true },
  { name: 'Elk Ridge Rd', kind: 'dirt', pts: [[-1180, 50], [-1290, 110], [-1400, 180], [-1490, 235]], culdesac: true },

  // ---------------------------------------------------------------- rural east: orchard, Hansen farm
  { name: 'Orchard Rd', kind: 'gravel', pts: [[1482, -209], [1484, -120], [1484, 0], [1482, 100], [1480, 200]], culdesac: true },
  { name: 'Hansen Rd', kind: 'gravel', pts: [[1640, -228.5], [1642, -280], [1636, -357]] },
];

export function buildNetwork(): RoadNetwork {
  const net = new RoadNetwork();
  for (const d of ROADS) net.add(d);
  net.finalize();
  return net;
}

export { interstateElev };

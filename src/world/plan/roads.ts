import { RoadNetwork, type RoadDef } from '../roads/network';
import { smoothstep } from '../core/rng';

/** Interstate viaduct sections (x ranges): the two interchanges, the river crossing and downtown (Wallace's 1991 viaduct). */
const VIADUCT: [number, number][] = [
  [-1150, -860],
  [-790, -650],
  [-470, 400],
  [860, 1150],
];
const DECK = 8.5;
const interstateElev = (x: number) => {
  let e = 0;
  for (const [a, b] of VIADUCT) e = Math.max(e, smoothstep(a - 150, a, x) * (1 - smoothstep(b, b + 150, x)));
  return e * DECK;
};

/** Every road in Pine Hollow. Coordinates in metres: x east, z south; downtown is at the origin. */
export const ROADS: RoadDef[] = [
  // ---------------------------------------------------------------- I-90 and its interchanges
  {
    name: 'I-90',
    kind: 'interstate',
    pts: [
      [-1845, -190],
      [-1500, -185],
      [-1200, -195],
      [-1000, -210],
      [-820, -238],
      [-700, -275],
      [-560, -320],
      [-400, -300],
      [-200, -250],
      [0, -210],
      [200, -212],
      [400, -205],
      [600, -185],
      [800, -165],
      [1000, -150],
      [1250, -160],
      [1500, -180],
      [1845, -200],
    ],
    elev: (x) => interstateElev(x),
    noBridge: true,
  },
  { name: 'Exit 61 EB off', kind: 'ramp', link: true, pts: [[-1235, -184.5], [-1170, -181], [-1100, -172], [-1050, -160], [-1007, -150]] },
  { name: 'Exit 61 EB on', kind: 'ramp', link: true, pts: [[-999, -141], [-950, -160], [-890, -190], [-840, -215], [-800, -236]] },
  { name: 'Exit 61 WB off', kind: 'ramp', link: true, pts: [[-780, -256], [-850, -256], [-920, -262], [-998, -268]] },
  { name: 'Exit 61 WB on', kind: 'ramp', link: true, pts: [[-1006, -283], [-1060, -262], [-1130, -232], [-1190, -212], [-1240, -202]] },
  { name: 'Exit 62 EB off', kind: 'ramp', link: true, pts: [[830, -151], [890, -146], [950, -133], [1000, -115], [1038, -100]] },
  { name: 'Exit 62 EB on', kind: 'ramp', link: true, pts: [[1046, -92], [1090, -108], [1150, -130], [1210, -146], [1260, -153]] },
  { name: 'Exit 62 WB off', kind: 'ramp', link: true, pts: [[1270, -171], [1200, -178], [1130, -188], [1075, -200], [1046, -205]] },
  { name: 'Exit 62 WB on', kind: 'ramp', link: true, pts: [[1044, -215], [990, -200], [930, -182], [870, -172], [830, -171]] },
  { name: 'Mill Rd', kind: 'rural', pts: [[-1000, -117], [-1004, -165], [-1006, -210], [-1002, -270], [-993, -352], [-985, -410], [-980, -432]] },
  { name: 'Silver Crown Rd', kind: 'rural', pts: [[1040, -3], [1042, -60], [1043, -150], [1045, -230], [1060, -290]] },

  // ---------------------------------------------------------------- Old US-10 business route: west → Bank St → Front St strip → east
  {
    name: 'Old US-10 W',
    kind: 'arterial',
    pts: [
      [-1845, -80],
      [-1500, -95],
      [-1250, -110],
      [-1050, -118],
      [-900, -112],
      [-760, -98],
      [-600, -85],
      [-460, -68],
      [-360, -55],
      [-300, -50],
    ],
  },
  { name: 'Bank St', kind: 'downtown', pts: [[-300, -50], [300, -50]] },
  { name: 'Front St', kind: 'strip', pts: [[300, -50], [400, -55], [520, -52], [640, -40], [760, -25], [880, -10], [1000, 0]] },
  { name: 'Old US-10 E', kind: 'arterial', pts: [[1000, 0], [1150, -8], [1300, -20], [1500, -40], [1845, -60]] },

  // ---------------------------------------------------------------- historic downtown (Wallace-style compact grid)
  {
    name: 'River St',
    kind: 'residential',
    pts: [
      [-382, -62],
      [-345, -95],
      [-300, -112],
      [-200, -118],
      [-60, -112],
      [80, -108],
      [220, -98],
      [318, -84],
      [372, -57],
    ],
  },
  { name: 'Cedar St', kind: 'downtown', pts: [[-300, 15], [300, 15]] },
  { name: 'Pine St', kind: 'residential', pts: [[-300, 85], [-150, 90], [0, 86], [150, 88], [300, 80]] },
  { name: '2nd St', kind: 'residential', pts: [[-255, -115], [-255, -50], [-255, 15], [-255, 86.5]] },
  { name: '3rd St', kind: 'downtown', pts: [[-170, -117], [-170, -50], [-170, 15], [-170, 89.4]] },
  { name: '4th St', kind: 'downtown', pts: [[-85, -113], [-85, -50], [-85, 15], [-85, 88.6]] },
  { name: '5th St', kind: 'downtown', pts: [[0, -110], [0, -50], [0, 15], [0, 86]] },
  { name: '6th St', kind: 'downtown', pts: [[85, -107.5], [85, -50], [85, 15], [85, 87.3]] },
  { name: '7th St', kind: 'downtown', pts: [[170, -102], [170, -50], [170, 15], [170, 87.2]] },
  { name: '8th St', kind: 'residential', pts: [[255, -93], [255, -50], [255, 15], [255, 82.5]] },
  { name: 'Bank Alley', kind: 'alley', pts: [[-255, -17.5], [255, -17.5]] },

  // ---------------------------------------------------------------- Old Town hillside (curvy streets climbing the south slope)
  { name: 'Placer Creek Rd', kind: 'rural', pts: [[85, 87.3], [95, 150], [115, 220], [140, 300], [165, 380], [200, 450]], culdesac: true },
  { name: 'Buena Vista Ave', kind: 'residential', pts: [[-255, 86.5], [-282, 140], [-252, 200], [-170, 236], [-80, 246], [0, 232], [60, 205], [93, 160]] },
  { name: 'King St', kind: 'residential', pts: [[-170, 89.4], [-160, 140], [-100, 172], [-30, 166], [-4, 125], [0, 86]] },
  { name: 'Hill St', kind: 'residential', pts: [[-170, 236], [-192, 285], [-150, 318], [-90, 318]], culdesac: true },
  { name: 'Mullan Ave', kind: 'residential', pts: [[-300, 85], [-380, 80], [-470, 62], [-568, 40]] },

  // ---------------------------------------------------------------- Silver Heights (post-war suburb: curvilinear loop + cul-de-sacs)
  { name: 'Silver Heights Dr', kind: 'suburban', pts: [[-520, -78], [-540, 0], [-600, 80], [-700, 130], [-800, 120], [-860, 60], [-852, -20], [-822, -102]] },
  { name: 'Aspen Ct', kind: 'suburban', pts: [[-600, 80], [-560, 118], [-505, 140]], culdesac: true },
  { name: 'Birch Ct', kind: 'suburban', pts: [[-700, 130], [-700, 190], [-688, 238]], culdesac: true },
  { name: 'Cedar Ct', kind: 'suburban', pts: [[-800, 120], [-845, 168], [-880, 205]], culdesac: true },
  { name: 'Larch Ct', kind: 'suburban', pts: [[-540, 0], [-490, 18], [-450, 22]], culdesac: true },
  { name: 'Juniper Ct', kind: 'suburban', pts: [[-852, -20], [-800, -38], [-752, -45]], culdesac: true },
  { name: 'Ponderosa Way', kind: 'suburban', pts: [[-860, 60], [-930, 90], [-990, 140], [-1020, 200]], culdesac: true },
  { name: 'School Rd', kind: 'residential', pts: [[-560, -84], [-556, -118], [-545, -146]] },

  // ---------------------------------------------------------------- east side: hospital, trailer park, Elm Crescent, lake
  { name: 'Hospital Dr', kind: 'residential', pts: [[800, -21], [802, 40], [800, 76]] },
  { name: 'Riverside Ln', kind: 'lane', pts: [[560, -50], [566, 30], [600, 95], [650, 110], [668, 40], [660, -38]] },
  {
    name: 'Lake Rd',
    kind: 'rural',
    pts: [
      [880, -10],
      [960, 60],
      [1060, 180],
      [1090, 320],
      [1040, 470],
      [930, 570],
      [790, 615],
      [640, 615],
      [520, 575],
      [420, 505],
      [385, 410],
      [395, 330],
    ],
    culdesac: true,
  },
  { name: 'Elm Crescent', kind: 'suburban', pts: [[960, 60], [920, 110], [880, 170], [870, 235]], culdesac: true },
  { name: 'Spruce Ct', kind: 'suburban', pts: [[920, 110], [975, 150], [1000, 215]], culdesac: true },
  { name: 'Orchard Ln', kind: 'gravel', pts: [[1060, 180], [1120, 175], [1170, 170]] },

  // ---------------------------------------------------------------- rural roads to farms, mill, mine and substation
  { name: 'Dairy Rd', kind: 'gravel', pts: [[-1450, -101], [-1452, -60], [-1445, -22]] },
  { name: 'Ridgeview Rd', kind: 'gravel', pts: [[-1200, -112], [-1205, -40], [-1200, 18]] },
  { name: 'Mine Rd', kind: 'dirt', pts: [[-980, -432], [-900, -434], [-820, -428], [-780, -440], [-792, -460], [-830, -472]], culdesac: true },
  { name: 'Substation Rd', kind: 'gravel', pts: [[-985, -410], [-1050, -440], [-1120, -462], [-1160, -470]] },
  { name: 'Hansen Rd', kind: 'gravel', pts: [[1330, -22], [1332, -70], [1325, -102]] },
];

export function buildNetwork(): RoadNetwork {
  const net = new RoadNetwork();
  for (const d of ROADS) net.add(d);
  net.finalize();
  return net;
}

export { interstateElev };

/**
 * Named districts of Pine Hollow (x east, z south). Used for the HUD location readout and the
 * labelled town map. Order matters: the first district containing a point wins.
 */
export type DistrictKind = 'civic' | 'downtown' | 'residential' | 'estate' | 'suburb' | 'commercial' | 'industrial' | 'rural' | 'lake' | 'park' | 'medical' | 'school';

export interface District {
  name: string;
  kind: DistrictKind;
  /** Map label anchor. */
  label: [number, number];
  /** Outline (closed polygon). */
  poly: [number, number][];
  /** Smaller districts can skip the big map label (they still name the area in the HUD). */
  minor?: boolean;
}

const rect = (x0: number, z0: number, x1: number, z1: number): [number, number][] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

export const DISTRICTS: District[] = [
  { name: 'Courthouse Square', kind: 'civic', label: [0, -47], poly: rect(-88, -82, 88, -12), minor: true },
  { name: 'Silver Valley Medical Center', kind: 'medical', label: [650, -38], poly: rect(612, -72, 690, -8), minor: true },
  { name: 'Riverside Mobile Home Park', kind: 'residential', label: [-690, -80], poly: rect(-745, -160, -632, -8), minor: true },
  { name: 'Sunnyside Elementary', kind: 'school', label: [-200, -650], poly: rect(-292, -698, -115, -606), minor: true },
  { name: 'Valley View Apartments', kind: 'residential', label: [600, -536], poly: rect(562, -566, 638, -506), minor: true },
  { name: 'Cascade Court Apartments', kind: 'residential', label: [-1100, 54], poly: rect(-1138, 24, -1062, 84), minor: true },
  { name: 'Mill Town', kind: 'residential', label: [-1140, -95], poly: rect(-1300, -190, -985, 22) },
  { name: 'Downtown · Main Street', kind: 'downtown', label: [-200, -36], poly: rect(-395, -85, 395, 60) },
  { name: 'Civic Row · Alder St', kind: 'civic', label: [150, 128], poly: rect(-300, 60, 300, 172) },
  { name: 'Riverfront', kind: 'park', label: [-250, -128], poly: [[-600, -100], [-560, -238], [560, -238], [620, -100], [600, -85], [-600, -85]] },
  { name: 'North Side', kind: 'residential', label: [-160, -372], poly: rect(-560, -440, 560, -238) },
  { name: 'Old Town', kind: 'residential', label: [-420, 140], poly: [[-506, -85], [-395, -85], [-395, 60], [-300, 60], [-300, 172], [300, 172], [300, 60], [395, 60], [395, -85], [506, -85], [512, 0], [536, 90], [564, 172], [445, 188], [300, 201], [200, 190], [100, 199], [0, 187], [-100, 199], [-200, 190], [-300, 201], [-445, 192], [-576, 182], [-536, 90], [-512, 0]] },
  { name: 'Church Hill', kind: 'estate', label: [-330, 300], poly: [[-576, 182], [-445, 192], [-300, 201], [-200, 190], [-110, 197], [-90, 300], [-80, 470], [-300, 500], [-720, 440], [-660, 300], [-580, 230]] },
  { name: 'Cedar Ridge', kind: 'estate', label: [230, 300], poly: [[-110, 197], [0, 187], [100, 199], [200, 190], [300, 201], [445, 188], [564, 172], [570, 280], [500, 420], [330, 520], [120, 570], [-80, 470], [-90, 300]] },
  { name: 'High School Campus', kind: 'school', label: [640, 135], poly: rect(560, 8, 760, 285) },
  { name: 'Eastgate', kind: 'suburb', label: [760, 400], poly: [[505, 285], [560, 285], [780, 285], [870, 230], [870, 480], [600, 480], [505, 420]] },
  { name: 'West End', kind: 'suburb', label: [-820, 230], poly: rect(-980, 60, -505, 330) },
  { name: 'Highway 10 West', kind: 'commercial', label: [-800, 70], poly: rect(-960, -60, -600, 60) },
  { name: 'Highway 10 East', kind: 'commercial', label: [1150, 80], poly: rect(760, -90, 1400, 95) },
  { name: 'Spirit Lake', kind: 'lake', label: [1180, 330], poly: [[890, 120], [1300, 110], [1500, 220], [1520, 420], [1340, 580], [1020, 580], [880, 460]] },
  { name: 'Eastside Warehouses', kind: 'industrial', label: [672, -300], poly: [[586, -392], [748, -386], [752, -222], [662, -214], [588, -224]] },
  { name: 'Industrial Flats', kind: 'industrial', label: [-780, -430], poly: [[-1120, -470], [-480, -470], [-480, -350], [-600, -200], [-1120, -170]] },
  { name: 'Sunnyside', kind: 'suburb', label: [330, -625], poly: rect(-765, -735, 765, -497) },
  { name: 'North Slope', kind: 'rural', label: [0, -770], poly: rect(-1100, -820, 1100, -497) },
  { name: 'West Valley Farms', kind: 'rural', label: [-1420, -60], poly: rect(-1860, -560, -960, 480) },
  { name: 'East Valley', kind: 'rural', label: [1650, -120], poly: rect(1400, -560, 1860, 480) },
];

function inPoly(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function districtAt(x: number, z: number): District | null {
  for (const d of DISTRICTS) if (inPoly(x, z, d.poly)) return d;
  return null;
}

/** Map colours per district kind (building footprints and legend). */
export const KIND_COLORS: Record<DistrictKind, string> = {
  civic: '#5a6f8c',
  downtown: '#9a4a3a',
  residential: '#8a6a52',
  estate: '#6b4a6b',
  suburb: '#9a7a52',
  commercial: '#b0603a',
  industrial: '#6b6b6b',
  rural: '#7a6a4a',
  lake: '#4f86a8',
  park: '#4f7a3a',
  medical: '#b03a3a',
  school: '#c9a227',
};

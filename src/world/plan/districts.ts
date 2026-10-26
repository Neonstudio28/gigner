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
  { name: 'Downtown · Main Street', kind: 'downtown', label: [-200, -36], poly: rect(-395, -85, 395, 60) },
  { name: 'Civic Row · Alder St', kind: 'civic', label: [150, 128], poly: rect(-300, 60, 300, 172) },
  { name: 'Riverfront', kind: 'park', label: [-250, -128], poly: [[-600, -100], [-560, -238], [560, -238], [620, -100], [600, -85], [-600, -85]] },
  { name: 'North Side', kind: 'residential', label: [-160, -372], poly: rect(-560, -440, 560, -238) },
  { name: 'Old Town', kind: 'residential', label: [-150, 222], poly: [[-505, -85], [-395, -85], [-395, 60], [-300, 60], [-300, 172], [300, 172], [300, 60], [395, 60], [395, -85], [505, -85], [505, 280], [-505, 280]] },
  { name: 'Church Hill', kind: 'residential', label: [-340, 380], poly: [[-560, 280], [-110, 280], [-110, 460], [-300, 500], [-700, 440], [-640, 300]] },
  { name: 'Cedar Ridge', kind: 'estate', label: [140, 420], poly: [[-110, 280], [330, 280], [330, 470], [180, 560], [-60, 540], [-110, 460]] },
  { name: 'High School Campus', kind: 'school', label: [640, 135], poly: rect(560, 8, 760, 285) },
  { name: 'Eastgate', kind: 'suburb', label: [760, 400], poly: [[505, 285], [560, 285], [780, 285], [870, 230], [870, 480], [600, 480], [505, 420]] },
  { name: 'West End', kind: 'suburb', label: [-820, 230], poly: rect(-980, 60, -505, 330) },
  { name: 'Highway 10 West', kind: 'commercial', label: [-800, 70], poly: rect(-960, -60, -600, 60) },
  { name: 'Highway 10 East', kind: 'commercial', label: [1150, 80], poly: rect(760, -90, 1400, 95) },
  { name: 'Spirit Lake', kind: 'lake', label: [1180, 330], poly: [[890, 120], [1300, 110], [1500, 220], [1520, 420], [1340, 580], [1020, 580], [880, 460]] },
  { name: 'Industrial Flats', kind: 'industrial', label: [-780, -430], poly: [[-1120, -470], [-480, -470], [-480, -350], [-600, -200], [-1120, -170]] },
  { name: 'North Slope', kind: 'rural', label: [0, -640], poly: rect(-1100, -800, 1100, -500) },
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

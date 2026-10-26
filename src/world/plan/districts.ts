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
  { name: 'Courthouse Square', kind: 'civic', label: [0, -165], poly: rect(-58, -198, 58, -132), minor: true },
  { name: 'Silver Valley Medical Center', kind: 'medical', label: [1010, -140], poly: rect(970, -175, 1050, -105), minor: true },
  { name: 'Pine Hollow High School', kind: 'school', label: [540, 60], poly: rect(470, -28, 612, 160), minor: true },
  { name: 'Riverfront', kind: 'park', label: [-170, -300], poly: rect(-430, -335, 430, -262) },
  { name: 'Downtown · Main Street', kind: 'downtown', label: [-230, -186], poly: rect(-430, -262, 430, -132) },
  { name: 'Civic Center', kind: 'civic', label: [210, -84], poly: rect(-365, -132, 365, -46) },
  { name: 'Old Town', kind: 'residential', label: [-10, 80], poly: rect(-365, -46, 365, 196) },
  { name: 'Church Hill', kind: 'residential', label: [-240, 330], poly: [[-420, 196], [-60, 196], [-40, 300], [-120, 470], [-360, 470], [-420, 320]] },
  { name: 'Cedar Ridge', kind: 'estate', label: [400, 300], poly: [[150, 196], [640, 196], [640, 420], [520, 500], [300, 520], [180, 440]] },
  { name: 'Eastside', kind: 'residential', label: [520, -90], poly: rect(365, -132, 660, 196) },
  { name: 'Front Street Strip', kind: 'commercial', label: [760, -250], poly: [[430, -300], [760, -330], [1250, -300], [1250, -130], [430, -130]] },
  { name: 'Riverside Mobile Home Park', kind: 'residential', label: [745, 15], poly: rect(660, -75, 860, 110), minor: true },
  { name: 'Eastgate', kind: 'suburb', label: [1110, 10], poly: rect(940, -110, 1260, 120) },
  { name: 'Spirit Lake', kind: 'lake', label: [1060, 330], poly: [[700, 130], [960, 110], [1300, 100], [1440, 220], [1440, 440], [1300, 600], [1000, 620], [760, 560], [690, 360]] },
  { name: 'Maple Grove', kind: 'suburb', label: [-720, 40], poly: [[-1045, -215], [-880, -215], [-470, -40], [-360, -40], [-360, 200], [-480, 200], [-640, 260], [-1045, 260]] },
  { name: 'Industrial Flats', kind: 'industrial', label: [-700, -505], poly: rect(-1215, -565, -400, -398) },
  { name: 'North Slope', kind: 'rural', label: [-200, -730], poly: rect(-1100, -800, 600, -590) },
  { name: 'West Valley Farms', kind: 'rural', label: [-1420, 20], poly: rect(-1860, -420, -1045, 450) },
  { name: 'East Valley', kind: 'rural', label: [1600, -60], poly: rect(1260, -560, 1860, 460) },
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

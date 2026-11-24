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
  { name: 'Town Green', kind: 'park', label: [45, -45], poly: rect(8, -82, 82, -12), minor: true },
  { name: 'Town Hall', kind: 'civic', label: [-45, -40], poly: rect(-82, -82, -8, -12), minor: true },
  { name: 'Civic Row', kind: 'civic', label: [0, 120], poly: rect(-82, 98, 82, 172), minor: true },
  { name: 'Lumber Yard', kind: 'industrial', label: [-890, 160], poly: rect(-960, 90, -820, 230) },
  { name: 'Container Yard', kind: 'industrial', label: [690, 185], poly: rect(630, 140, 760, 235), minor: true },
  { name: 'Freight District', kind: 'industrial', label: [600, 80], poly: rect(430, -120, 780, 260) },
  { name: 'Main Street', kind: 'downtown', label: [0, 26], poly: rect(-368, -40, 368, 44) },
  { name: 'Lakefront', kind: 'lake', label: [0, 305], poly: rect(-368, 282, 368, 360) },
  { name: 'Lakeshore', kind: 'residential', label: [-200, 250], poly: rect(-368, 226, 368, 282), minor: true },
  { name: 'Maple Street', kind: 'residential', label: [0, 200], poly: rect(-368, 136, 368, 226) },
  { name: 'Alder Street', kind: 'residential', label: [-220, 90], poly: rect(-368, 44, 368, 136) },
  { name: 'River Street', kind: 'residential', label: [0, -70], poly: rect(-368, -120, 368, -40) },
  { name: 'Pine Lake', kind: 'lake', label: [40, 560], poly: rect(-560, 360, 640, 870) },
  { name: 'North Farms', kind: 'rural', label: [0, -420], poly: rect(-620, -700, 620, -120) },
  { name: 'West Valley', kind: 'rural', label: [-1150, 40], poly: rect(-1900, -700, -368, 900) },
  { name: 'East Valley', kind: 'rural', label: [1150, 40], poly: rect(368, -700, 1900, 900) },
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

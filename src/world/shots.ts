import * as THREE from 'three';

export interface Shot {
  id: string;
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/** Camera presets framed after the reference shots (plus vistas of the newer districts). Keys 1–0 pick the first ten. */
export const SHOTS: Shot[] = [
  { id: 'main', name: 'Main Street — Don’s Donuts & Bank', pos: [-4.5, 1.7, 17.5], target: [-40, 5.0, -15], fov: 50 },
  { id: 'intersection', name: 'Main & Pine — 86 Gasoline', pos: [-14, 9.5, 16], target: [30, 1.5, -28] },
  { id: 'square', name: 'Courthouse Square', pos: [-9, 2.2, -75.5], target: [0, 9.5, -118], fov: 54 },
  { id: 'townhall', name: 'Town Hall — Cedar Ln', pos: [-4.5, 1.7, -159], target: [-30, 6.5, -178], fov: 54 },
  { id: 'courtst', name: 'Court Street — Restaurants & Liberty Theater', pos: [-121, 3.2, -74], target: [-40, 4, -63] },
  { id: 'downtown', name: 'Aerial — Dense Downtown', pos: [-150, 105, 10], target: [-5, 0, -95], fov: 50 },
  { id: 'carlot', name: 'Bob’s Used Cars', pos: [149, 2.3, -6.0], target: [165, 2.0, -31] },
  { id: 'alley', name: 'Back Alley', pos: [-112, 2.3, -48.5], target: [-60, 3, -47] },
  { id: 'houses', name: 'Pine Ave Homes', pos: [-3.6, 1.8, -250], target: [-26, 3.4, -282] },
  { id: 'farm', name: 'Hansen Farm on US-20', pos: [345, 14, -14], target: [372, 4, 46] },
  { id: 'theater', name: 'Liberty Theater', pos: [-55, 1.8, -78.5], target: [-64.5, 6.2, -63] },
  { id: 'civic', name: 'Police Station & Civic Center', pos: [70, 10, -161], target: [28, 3, -182] },
  { id: 'aerial', name: 'Aerial — Main Street', pos: [-75, 52, 72], target: [0, 0, -16] },
  { id: 'lumber', name: 'Cascade Lumber Yard', pos: [-143, 17, 2], target: [-170, 0, 42] },
  { id: 'warehouse', name: 'Sheriff & Warehouse', pos: [-30, 21, 4], target: [-82, 5, 34] },
  { id: 'corner', name: 'Main Street West', pos: [58, 3.4, -3], target: [-30, 5, -15] },
  { id: 'porch', name: 'Front Porch', pos: [-9, 1.7, -209.5], target: [-22, 2.2, -208] },
  { id: 'tex', name: 'Tex Outpost on US-20', pos: [222, 1.8, -3.5], target: [230, 6.5, -30] },
  { id: 'dairy', name: 'Miller Dairy', pos: [-548, 15, 4], target: [-600, 2, 70] },
  { id: 'hayfarm', name: 'Ridgeview Farm on SR-9', pos: [-14, 22, -660], target: [-110, 0, -735] },
  { id: 'orchard', name: 'Sunny Acres Orchard', pos: [22, 16, 510], target: [110, 0, 600] },
  { id: 'pylons', name: 'High-Voltage Line', pos: [40, 14, -400], target: [110, 26, -490], fov: 55 },
  { id: 'substation', name: 'Substation 4', pos: [-276, 16, -226], target: [-332, 2, -262] },
  { id: 'valley', name: 'Valley Overview', pos: [-300, 140, 380], target: [60, 0, -140], fov: 55 },
  { id: 'lake', name: 'Lake & Mountains', pos: [520, 26, 210], target: [760, 40, 520] },
  { id: 'highway', name: 'US-20 — Welcome Sign', pos: [-470, 3.2, 9], target: [-200, 6, -10] },
];

export const shotVec = (s: Shot) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) });

import * as THREE from 'three';

export interface Shot {
  id: string;
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/** Camera presets framed after the reference shots (plus a few extra vistas). */
export const SHOTS: Shot[] = [
  { id: 'main', name: 'Main Street — Don’s Donuts & Bank', pos: [-4.5, 1.7, 17.5], target: [-40, 5.0, -15], fov: 50 },
  { id: 'intersection', name: 'Main & Pine — 86 Gasoline', pos: [-14, 9.5, 16], target: [30, 1.5, -28] },
  { id: 'carlot', name: 'Bob’s Used Cars', pos: [149, 2.3, -6.0], target: [165, 2.0, -31] },
  { id: 'aerial', name: 'Aerial — Downtown', pos: [-75, 52, 72], target: [0, 0, -16] },
  { id: 'houses', name: 'Pine Ave Homes', pos: [-3.5, 1.8, -118], target: [-26, 3.6, -150] },
  { id: 'lumber', name: 'Cascade Lumber Yard', pos: [-143, 17, 2], target: [-170, 0, 42] },
  { id: 'farm', name: 'Farm on US-20', pos: [345, 14, -14], target: [372, 4, 46] },
  { id: 'warehouse', name: 'Sheriff & Warehouse', pos: [-30, 21, 4], target: [-82, 5, 34] },
  { id: 'corner', name: 'Main Street West', pos: [58, 3.4, -3], target: [-30, 5, -15] },
  { id: 'porch', name: 'Front Porch', pos: [-9, 1.7, -129.5], target: [-22, 2.2, -128] },
  { id: 'valley', name: 'Valley Overview', pos: [-300, 140, 380], target: [60, 0, -140], fov: 55 },
  { id: 'lake', name: 'Lake & Mountains', pos: [520, 26, 210], target: [760, 40, 520] },
  { id: 'highway', name: 'US-20 — Welcome Sign', pos: [-470, 3.2, 9], target: [-200, 6, -10] },
];

export const shotVec = (s: Shot) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) });

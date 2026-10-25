import * as THREE from 'three';

export interface Shot {
  id: string;
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/** Camera presets around Pine Hollow. Keys 1–0 pick the first ten. x = east, z = south; downtown at the origin. */
export const SHOTS: Shot[] = [
  { id: 'bank', name: 'Bank Street — Historic Downtown', pos: [-70, 1.8, -44.5], target: [70, 5, -56], fov: 52 },
  { id: 'courthouse', name: 'Pine County Courthouse', pos: [-196, 2.2, -38], target: [-214, 11, -84], fov: 56 },
  { id: 'townhall', name: 'City Hall — Cedar Street', pos: [24, 2.2, 4], target: [42, 11, 50], fov: 56 },
  { id: 'viaduct', name: 'I-90 Viaduct over Downtown', pos: [-110, 4, -138], target: [40, 11, -214], fov: 55 },
  { id: 'strip', name: 'Front Street Strip — Fast Food Row', pos: [430, 14, -12], target: [640, 2, -46], fov: 52 },
  { id: 'downtown', name: 'Aerial — Downtown & Old Town', pos: [-330, 150, 260], target: [-40, 0, -40], fov: 50 },
  { id: 'suburb', name: 'Silver Heights Cul-de-sacs', pos: [-560, 70, 230], target: [-720, 0, 50], fov: 52 },
  { id: 'oldtown', name: 'Old Town Hillside', pos: [-40, 26, 120], target: [-160, 12, 230], fov: 52 },
  { id: 'lake', name: 'Spirit Lake Cabins & Marina', pos: [430, 34, 330], target: [690, 0, 520], fov: 52 },
  { id: 'valley', name: 'Valley Overview', pos: [320, 640, 1240], target: [0, 0, -120], fov: 55 },
  { id: 'hospital', name: 'Silver Valley Medical Center', pos: [780, 12, 28], target: [800, 6, 104], fov: 55 },
  { id: 'trailer', name: 'Riverside Mobile Home Park', pos: [560, 22, -18], target: [622, 0, 52], fov: 52 },
  { id: 'river', name: 'South Fork — River Street', pos: [-80, 6, -128], target: [-260, 2, -170], fov: 55 },
  { id: 'mill', name: 'Cascade Lumber Mill', pos: [-930, 32, -382], target: [-1010, 0, -460], fov: 52 },
  { id: 'mine', name: 'Sierra Silver Mine', pos: [-800, 22, -438], target: [-858, 6, -500], fov: 52 },
  { id: 'pylons', name: 'High-Voltage Line & Substation', pos: [-1100, 34, -410], target: [-1182, 14, -478], fov: 55 },
  { id: 'dairy', name: 'Miller Dairy', pos: [-1390, 34, -70], target: [-1450, 0, 20], fov: 52 },
  { id: 'hansen', name: 'Hansen Farm', pos: [1250, 26, -30], target: [1330, 2, -105], fov: 52 },
  { id: 'interchange', name: 'Exit 62 Interchange', pos: [900, 70, -40], target: [1045, 0, -170], fov: 52 },
  { id: 'canyon', name: 'Placer Creek Canyon', pos: [60, 30, 190], target: [170, 18, 380], fov: 55 },
];

export const shotVec = (s: Shot) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) });

import * as THREE from 'three';

export interface Shot {
  id: string;
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/** Camera presets around Pine Hollow. Keys 1–0 pick the first ten. x = east, z = south; Courthouse Square at (0, -165). */
export const SHOTS: Shot[] = [
  { id: 'main', name: 'Main Street — Downtown', pos: [-130, 1.8, -208.5], target: [60, 5, -212], fov: 52 },
  { id: 'courthouse', name: 'Courthouse Square', pos: [-24, 2.2, -216], target: [0, 10, -170], fov: 56 },
  { id: 'cityhall', name: 'Court Street — City Hall & Police', pos: [-170, 2.2, -124], target: [-205, 7, -92], fov: 56 },
  { id: 'bridge', name: 'Bridge Street over the South Fork', pos: [40, 9, -385], target: [0, 4, -290], fov: 55 },
  { id: 'strip', name: 'Front Street Strip', pos: [440, 12, -205], target: [650, 2, -215], fov: 52 },
  { id: 'downtown', name: 'Aerial — Downtown & Old Town', pos: [-360, 190, 140], target: [0, 0, -150], fov: 50 },
  { id: 'oldtown', name: 'Old Town', pos: [-210, 26, 210], target: [-80, 5, 60], fov: 52 },
  { id: 'cedarridge', name: 'Cedar Ridge Estates', pos: [180, 55, 150], target: [380, 22, 330], fov: 52 },
  { id: 'lake', name: 'Spirit Lake', pos: [690, 45, 160], target: [1010, 0, 440], fov: 52 },
  { id: 'valley', name: 'Valley Overview', pos: [300, 760, 1350], target: [0, 0, -150], fov: 55 },
  { id: 'maplegrove', name: 'Maple Grove Cul-de-sacs', pos: [-520, 80, 230], target: [-720, 0, 40], fov: 52 },
  { id: 'hospital', name: 'Silver Valley Medical Center', pos: [1010, 12, -205], target: [1010, 6, -140], fov: 55 },
  { id: 'trailer', name: 'Riverside Mobile Home Park', pos: [650, 25, -100], target: [760, 0, 20], fov: 52 },
  { id: 'river', name: 'Riverwalk Park', pos: [-60, 6, -285], target: [-260, 2, -320], fov: 55 },
  { id: 'school', name: 'Pine Hollow High School', pos: [540, 30, -70], target: [540, 0, 80], fov: 55 },
  { id: 'industrial', name: 'Industrial Flats', pos: [-620, 45, -400], target: [-700, 0, -490], fov: 52 },
  { id: 'mill', name: 'Cascade Lumber Mill', pos: [-960, 35, -400], target: [-1080, 0, -480], fov: 52 },
  { id: 'mine', name: 'Sierra Silver Mine', pos: [-690, 25, -640], target: [-625, 6, -700], fov: 52 },
  { id: 'interchange', name: 'Exit 62 Interchange', pos: [-150, 80, -460], target: [0, 0, -575], fov: 52 },
  { id: 'cemetery', name: 'Church Hill Cemetery', pos: [-220, 30, 330], target: [-300, 10, 410], fov: 52 },
  { id: 'lodge', name: 'Spirit Lake Lodge', pos: [980, 20, 470], target: [1060, 5, 545], fov: 52 },
  { id: 'dairy', name: 'Miller Dairy', pos: [-1420, 34, -230], target: [-1480, 0, -130], fov: 52 },
];

export const shotVec = (s: Shot) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) });

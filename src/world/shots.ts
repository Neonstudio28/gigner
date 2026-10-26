import * as THREE from 'three';

export interface Shot {
  id: string;
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/** Camera presets around Pine Hollow. Keys 1–0 pick the first ten. x = east, z = south; Main St runs along z = 0. */
export const SHOTS: Shot[] = [
  { id: 'main', name: 'Main Street — Downtown', pos: [-170, 1.8, 2.5], target: [60, 5, 0], fov: 52 },
  { id: 'courthouse', name: 'Courthouse Square', pos: [-24, 2.2, 22], target: [0, 10, -40], fov: 56 },
  { id: 'alder', name: 'Alder Street — Civic Row', pos: [-210, 2.2, 86], target: [-150, 6, 122], fov: 56 },
  { id: 'riverfront', name: 'Riverfront Park', pos: [-80, 7, -104], target: [-260, 2, -150], fov: 55 },
  { id: 'bridge', name: 'Division St Bridge', pos: [70, 10, -205], target: [0, 3, -140], fov: 55 },
  { id: 'downtown', name: 'Aerial — Downtown', pos: [-320, 190, 330], target: [0, 0, -20], fov: 50 },
  { id: 'oldtown', name: 'Old Town', pos: [-280, 28, 260], target: [-120, 5, 140], fov: 52 },
  { id: 'cedarridge', name: 'Cedar Ridge', pos: [-80, 55, 250], target: [110, 25, 430], fov: 52 },
  { id: 'lake', name: 'Spirit Lake', pos: [840, 45, 200], target: [1180, 0, 400], fov: 52 },
  { id: 'valley', name: 'Valley Overview', pos: [300, 760, 1350], target: [0, 0, -60], fov: 55 },
  { id: 'northside', name: 'North Side', pos: [-220, 45, -150], target: [0, 5, -330], fov: 52 },
  { id: 'westend', name: 'West End & Elementary', pos: [-540, 60, 330], target: [-720, 0, 150], fov: 52 },
  { id: 'school', name: 'High School Campus', pos: [520, 35, -40], target: [640, 0, 150], fov: 55 },
  { id: 'hospital', name: 'Silver Valley Medical Center', pos: [650, 12, 30], target: [650, 6, -38], fov: 55 },
  { id: 'east', name: 'Highway 10 East', pos: [760, 10, 15], target: [1000, 3, 0], fov: 52 },
  { id: 'west', name: 'Highway 10 West', pos: [-640, 10, -15], target: [-860, 2, 0], fov: 52 },
  { id: 'trailer', name: 'Riverside Mobile Home Park', pos: [-600, 28, -50], target: [-700, 0, -100], fov: 52 },
  { id: 'industrial', name: 'Industrial Flats', pos: [-560, 45, -250], target: [-660, 0, -360], fov: 52 },
  { id: 'mill', name: 'Cascade Lumber Mill', pos: [-880, 35, -180], target: [-1000, 0, -250], fov: 52 },
  { id: 'mine', name: 'Sierra Silver Mine', pos: [-850, 25, -600], target: [-935, 6, -660], fov: 52 },
  { id: 'interchange', name: 'Exit 61 Interchange', pos: [-620, 80, -380], target: [-760, 0, -474], fov: 52 },
  { id: 'cemetery', name: 'Church Hill Cemetery', pos: [-330, 30, 380], target: [-410, 12, 450], fov: 52 },
  { id: 'lodge', name: 'Spirit Lake Lodge', pos: [1100, 22, 600], target: [1180, 5, 512], fov: 52 },
  { id: 'dairy', name: 'Miller Dairy', pos: [-1400, 34, 60], target: [-1450, 0, 160], fov: 52 },
];

export const shotVec = (s: Shot) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) });

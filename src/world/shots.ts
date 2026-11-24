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
  { id: 'main', name: 'Main Street', pos: [-150, 2.2, 3], target: [60, 4, 0], fov: 55 },
  { id: 'green', name: 'Town Hall & the Green', pos: [8, 3, -6], target: [-40, 7, -34], fov: 58 },
  { id: 'courthouse', name: 'Hollow County Courthouse', pos: [22, 2.4, 80], target: [45, 8, 112], fov: 58 },
  { id: 'church', name: 'Community Church', pos: [-22, 2.4, 82], target: [-45, 9, 112], fov: 58 },
  { id: 'gas', name: "Timberline Gas & Dottie's Diner", pos: [-190, 3, -4], target: [-228, 3, 22], fov: 58 },
  { id: 'donut', name: 'Hole Lotta Donuts & Sheriff', pos: [196, 3, 4], target: [228, 5, -22], fov: 58 },
  { id: 'lakefront', name: 'Lakefront & Pier', pos: [-28, 5, 322], target: [20, 1, 318], fov: 58 },
  { id: 'maple', name: 'Maple Street Homes', pos: [-120, 2.4, 181], target: [40, 3, 178], fov: 55 },
  { id: 'aerial', name: 'Aerial: Pine Hollow', pos: [-330, 210, 470], target: [0, 0, 80], fov: 50 },
  { id: 'valley', name: 'Valley Overview', pos: [300, 760, 1350], target: [0, 0, -60], fov: 55 },
  { id: 'motel', name: 'Pine Rest Motel', pos: [282, 3, -6], target: [318, 3, 24], fov: 58 },
  { id: 'grocery', name: 'Hollow Foods Market', pos: [-282, 3, 6], target: [-318, 3, -26], fov: 58 },
  { id: 'lumber', name: 'Hollow Creek Lumber Co.', pos: [-800, 22, 225], target: [-860, 2, 160], fov: 55 },
  { id: 'freight', name: 'Container Yard', pos: [735, 22, 215], target: [680, 2, 160], fov: 55 },
  { id: 'cannery', name: 'Pine Hollow Canning Co.', pos: [530, 26, 272], target: [590, 4, 205], fov: 55 },
  { id: 'farm', name: 'Orchard Road Farm', pos: [150, 14, -360], target: [205, 3, -405], fov: 55 },
  { id: 'dairy', name: 'Miller Dairy Road', pos: [-1440, 16, 60], target: [-1500, 3, 115], fov: 55 },
  { id: 'east', name: 'Highway 10 East', pos: [420, 6, 4], target: [700, 3, 0], fov: 52 },
  { id: 'west', name: 'Highway 10 West', pos: [-420, 6, -4], target: [-700, 2, 0], fov: 52 },
  { id: 'river', name: 'River Street', pos: [-120, 5, -96], target: [80, 2, -100], fov: 55 },
];

export const shotVec = (s: Shot) => ({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target) });

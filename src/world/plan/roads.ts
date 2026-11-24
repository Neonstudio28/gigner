import { RoadNetwork, type RoadDef, type RoadKind } from '../roads/network';

/**
 * Pine Hollow town plan. Coordinates in metres: x east, z south.
 *
 * Highway 10 winds down the valley, widens into a commercial strip (W Main) and narrows again into four kerbed
 * downtown blocks of Main Street. Around that core the streets step down in rank: Division St, Riverside Dr,
 * Alder St and Lakeshore Dr collect; the avenues and Maple St are ordinary residential streets that bend, stop
 * short or end in a T; service alleys run behind the shop rows. Outside it: Cedar Ridge (the view lots on the
 * hill above the lake), the Flats by the cannery, the Whispering Pines trailer court off Fairground Rd, the
 * freight and container yards, the lumber yard in the western woods and the farms across the river.
 */

/** The downtown core: avenue centre lines, the alleys behind Main Street's shop rows and the streets behind those. */
export const CORE = { aves: [-200, -100, 0, 100, 200], alley: 37, north: -92, south: 86 };

/** Every road in Pine Hollow. */
export const ROADS: RoadDef[] = [
  // ---------------------------------------------------------------- Highway 10 -> the strip -> Main Street
  { name: 'Old Hwy 10 W', label: 'Highway 10', kind: 'arterial', pts: [[-1845, 40], [-1500, 30], [-1200, 15], [-1050, 9], [-950, 5], [-760, 0], [-640, 3], [-560, 6], [-500, 10], [-420, 12]] },
  { name: 'W Main St', label: 'Main St', kind: 'strip', pts: [[-420, 12], [-330, 7], [-260, 2], [-200, 0]] },
  { name: 'Main St', kind: 'downtown', pts: [[-200, 0], [200, 0]] },
  { name: 'E Main St', label: 'Main St', kind: 'collector', pts: [[200, 0], [300, 0], [360, 0], [420, 0]] },
  { name: 'Old Hwy 10 E', label: 'Highway 10', kind: 'arterial', pts: [[420, 0], [520, 0], [700, 0], [820, 2], [900, 5], [1000, 10], [1150, 20], [1400, 10], [1650, -10], [1845, -30]] },

  // ---------------------------------------------------------------- collectors
  { name: 'Division St', kind: 'downtown', pts: [[0, -92], [0, 0], [0, 86]] },
  { name: 'Division St S', label: 'Division St', kind: 'residential', pts: [[0, 86], [0, 188], [0, 270]] },
  { name: 'Riverside Dr', kind: 'collector', pts: [[-330, 7], [-334, -30], [-312, -64], [-260, -84], [-200, -90], [-100, -94], [0, -92], [100, -92], [200, -88], [280, -78], [336, -52], [360, 0]] },
  { name: 'Alder St', kind: 'collector', pts: [[-260, 2], [-263, 40], [-242, 71], [-200, 85], [-100, 86], [0, 86], [100, 86], [200, 88], [303, 88]] },
  { name: 'Lakeshore Dr', kind: 'collector', pts: [[-400, 318], [-300, 298], [-200, 282], [-100, 273], [0, 270], [100, 271], [200, 279], [300, 294], [400, 316]] },

  // ---------------------------------------------------------------- avenues: wide through the core, ordinary streets south of Alder
  { name: '1st Ave W', kind: 'collector', pts: [[-100, -94], [-100, 0], [-100, 86]] },
  { name: '1st Ave W S', label: '1st Ave W', kind: 'residential', pts: [[-100, 86], [-103, 140], [-100, 190]] },
  { name: '1st Ave E', kind: 'collector', pts: [[100, -92], [100, 0], [100, 86]] },
  { name: '1st Ave E S', label: '1st Ave E', kind: 'residential', pts: [[100, 86], [98, 135], [100, 180]] },
  { name: '2nd Ave W', kind: 'residential', pts: [[-200, -90], [-200, 0], [-200, 85]] },
  { name: '2nd Ave E', kind: 'residential', pts: [[200, -88], [200, 0], [200, 88], [204, 172], [214, 230], [200, 279]] },
  { name: '3rd Ave E', kind: 'residential', pts: [[300, 0], [303, 88], [312, 166], [318, 236], [300, 294]] },
  // Lake Hill Rd drops from the foot of 2nd Ave W to the lake on a long bend; Maple St leaves it and bows toward the shore
  { name: 'Lake Hill Rd', kind: 'residential', pts: [[-200, 85], [-212, 140], [-246, 200], [-284, 250], [-300, 298]] },
  { name: 'Maple St', kind: 'residential', pts: [[-212, 140], [-170, 172], [-100, 190], [0, 188], [100, 180], [204, 172], [312, 166]] },
  { name: 'Heron Ct', kind: 'residential', pts: [[-100, 190], [-112, 226], [-150, 240]], culdesac: true },
  { name: 'Birch Ct', kind: 'residential', pts: [[100, 180], [108, 222], [84, 244]], culdesac: true },

  // ---------------------------------------------------------------- service alleys behind the Main Street rows
  { name: 'Alley S', label: '', kind: 'alley', pts: [[-200, CORE.alley], [200, CORE.alley]] },
  { name: 'Alley NW', label: '', kind: 'alley', pts: [[-200, -CORE.alley], [0, -CORE.alley]] },
  { name: 'Alley NE', label: '', kind: 'alley', pts: [[131, -CORE.alley], [200, -CORE.alley]] },

  // ---------------------------------------------------------------- lake front, beyond the core
  { name: 'Lakeshore Dr W', label: 'Lakeshore Dr', kind: 'rural', pts: [[-400, 318], [-470, 338], [-540, 356], [-600, 390], [-640, 440]], culdesac: true },
  { name: 'Lakeshore Dr E', label: 'Lakeshore Dr', kind: 'rural', pts: [[400, 316], [460, 298], [520, 255]] },

  // ---------------------------------------------------------------- Cedar Ridge: the view lots on the hill above the lake
  { name: 'Ridgecrest Dr', kind: 'suburban', pts: [[-500, 10], [-506, 80], [-532, 148], [-588, 196], [-648, 212], [-700, 186]], culdesac: true },
  { name: 'Lakeview Ct', kind: 'suburban', pts: [[-588, 196], [-574, 256], [-528, 300]], culdesac: true },

  // ---------------------------------------------------------------- the Flats: cannery workers' streets, no kerbs
  { name: 'Tannery St', kind: 'lane', pts: [[312, 166], [380, 176], [450, 171], [520, 180]] },
  { name: 'Slough Rd', kind: 'gravel', pts: [[318, 236], [370, 246], [440, 252], [482, 290]], culdesac: true },

  // ---------------------------------------------------------------- north over the river: farm country
  { name: 'County Rd 5', kind: 'rural', pts: [[0, -92], [0, -160], [0, -240], [4, -340], [0, -430], [-6, -520], [0, -610]], culdesac: true },
  { name: 'Orchard Rd', kind: 'gravel', pts: [[0, -340], [140, -336], [300, -345], [460, -340], [600, -330]], culdesac: true },
  { name: 'Hansen Rd', kind: 'gravel', pts: [[0, -430], [-150, -436], [-320, -428], [-480, -420], [-620, -400]], culdesac: true },

  // ---------------------------------------------------------------- west: trailer court, lumber yard, dairy
  { name: 'Mill Rd', kind: 'rural', pts: [[-760, 0], [-770, 90], [-800, 180], [-850, 260], [-900, 330]], culdesac: true },
  { name: 'Fairground Rd', kind: 'gravel', pts: [[-560, 6], [-560, -50], [-560, -110], [-565, -140]], culdesac: true },
  { name: 'Pine Loop', label: 'Whispering Pines', kind: 'gravel', pts: [[-560, -50], [-512, -46], [-474, -58], [-462, -88], [-480, -114], [-520, -118], [-560, -110]] },
  { name: 'Miller Dairy Rd', kind: 'gravel', pts: [[-1450, 27.5], [-1450, 70], [-1450, 130]], culdesac: true },
  { name: 'Ridgeview Ln', kind: 'gravel', pts: [[-1200, 15], [-1200, -60], [-1198, -140]], culdesac: true },
  { name: 'Cougar Creek Rd', kind: 'gravel', pts: [[-1050, 9], [-1060, 120], [-1090, 230], [-1070, 330]], culdesac: true },

  // ---------------------------------------------------------------- east: freight yard, container yard, farms beyond the bridge
  { name: 'Cannery Rd', kind: 'rural', pts: [[520, 0], [520, 90], [520, 180], [520, 255], [530, 330], [560, 390]], culdesac: true },
  { name: 'Freight Rd', kind: 'rural', pts: [[520, 90], [620, 90], [720, 92], [800, 100]], culdesac: true },
  { name: 'Depot Rd', kind: 'rural', pts: [[520, 0], [520, -60], [524, -110]], culdesac: true },
  { name: 'Eastside Rd', kind: 'gravel', pts: [[1150, 20], [1152, -100], [1150, -220], [1140, -330]], culdesac: true },
  { name: 'Homestead Rd', kind: 'gravel', pts: [[1400, 10], [1402, 110], [1400, 230]], culdesac: true },
];

export function buildNetwork(): RoadNetwork {
  const net = new RoadNetwork();
  for (const d of ROADS) net.add(d);
  net.finalize();
  return net;
}

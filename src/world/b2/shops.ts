import type { Col } from '../core/kit';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { room, furnishStore, furnishBar, furnishCafe, furnishOffice } from '../buildings/interiors';
import { F_OS } from './kit2';
import { face, win, door, pilaster, cornice, awning, signBoard, WHITE, STONE, DARK } from './kit2';
import { hull, upper, spread, put, type Look, type Op } from './hull';
import { parapetRoof, roofGear, services, gutter } from './parts';

export interface ShopO {
  id: string;
  name: string;
  w: number;
  d: number;
  storeys?: 1 | 2;
  wall?: Col;
  wallMat?: string;
  trim?: Col;
  /** Shopfront joinery and door colour. */
  frame?: Col;
  doorCol?: Col;
  /** Fascia sign: text, sub-line, background and ink. */
  sign: [string, string, string, string];
  awn?: [Col, Col] | null;
  inside?: 'store' | 'bar' | 'cafe' | 'office';
  look?: Partial<Look>;
  /** Door position: centre or to one side. */
  doorX?: number;
  cornice?: 'bracket' | 'dentil' | 'scallop' | 'plain';
  /** Corner lot: display windows down this side too. */
  side?: 'l' | 'r';
  /** Window head style upstairs. */
  head?: 'lintel' | 'arch' | 'hood';
  blade?: string;
}

const LOOKS: Record<string, Look> = {
  store: { wall: 0xe6dcc3, wains: 0x8a6a48, floor: 0xb98e62, floorMat: 'woodFloor', lights: 'troffer' },
  bar: { wall: 0x6e4a3a, wains: 0x4a3122, floor: 0x7a5a40, floorMat: 'woodFloor', ceil: 0x8a7a66, ceilMat: 'beadboard', lights: 'pendant', step: 3.2 },
  cafe: { wall: 0xe9d9a8, wains: 0x5f8a7a, floor: 0xffffff, floorMat: 'checker', lights: 'pendant', step: 3.4 },
  office: { wall: 0xd7dccb, wains: 0x7a6248, floor: 0x8f8a80, floorMat: 'carpet', lights: 'troffer' },
};

/** Main-street block: recessed shopfront under a lit fascia sign, optional flat above, cornice and parapet. */
export function shop(c: Ctx, x: number, z: number, ry: number, o: ShopO) {
  const { kit: k, rng } = c;
  const st = o.storeys ?? 1;
  const y0 = 0.18;
  const h1 = 3.5;
  const band = 1.25;
  const H = y0 + h1 + band + (st === 2 ? 3.5 : 0);
  const wall = o.wall ?? 0xffffff;
  const mat = o.wallMat ?? 'brickRed';
  const trim = o.trim ?? WHITE;
  const fr = o.frame ?? 0x2f3a36;
  const dx = o.doorX ?? 0;
  const inside = o.inside ?? 'store';
  const L: Look = { ...LOOKS[inside], ...o.look };
  c.occ.add(x, z, o.w, o.d, ry, 1.2, false);
  k.at(x, z, ry, () => {
    // ground floor: display windows either side of the door, a back door and a small rear window
    const f: Op[] = [{ x: dx, w: 1.1, h: 2.3, kind: 'door', color: o.doorCol ?? fr, door: { glass: true, transom: 0.5, frame: fr } }];
    const x0 = -o.w / 2 + 0.9;
    const x1 = o.w / 2 - 0.9;
    for (const [a, b] of [[x0, dx - 0.95], [dx + 0.95, x1]]) if (b - a > 0.9) f.push({ x: (a + b) / 2, w: b - a, y: 0.55, h: 2.3, kind: 'shop', color: o.doorCol ?? fr });
    const b: Op[] = [{ x: o.w / 2 - 1.6, w: 0.95, h: 2.1, kind: 'door', color: 0x6b6f73, door: { frame: 0x8a8580 } }, { x: -o.w / 4, w: 1.0, y: 1.3, h: 1.1, kind: 'win', win: { frame: 0x8a8580, my: 1, sill: 0xa9a59c } }];
    const sideOps: Op[] = o.side ? spread(Math.max(1, Math.floor((o.d - 4) / 4.5)), o.d - 4).map((sx) => ({ x: sx, w: 3.0, y: 0.55, h: 2.3, kind: 'shop' as const, color: o.doorCol ?? fr })) : [];
    const { a, b: bb } = hull(k, { w: o.w, d: o.d, y0, h: h1, wall, wallMat: mat, look: L, frame: fr, f, b, l: o.side === 'l' ? sideOps : [], r: o.side === 'r' ? sideOps : [], base: 0x8f8c87 });
    room(k, y0, () => (inside === 'bar' ? furnishBar : inside === 'cafe' ? furnishCafe : inside === 'office' ? furnishOffice : furnishStore)(k, rng, a, bb, dx));
    // sign band and upper floor
    k.box(0, y0 + h1, 0, o.w, band, o.d, wall, mat);
    if (st === 2) {
      const n = Math.max(2, Math.floor((o.w - 1.6) / 2.4));
      const sideN = Math.max(2, Math.floor((o.d - 3) / 3.4));
      const wo = { frame: trim, head: o.head ?? 'lintel', headCol: STONE, sill: STONE } as const;
      upper(k, o.w, o.d, y0 + h1 + band, 3.5, wall, mat, {
        f: { xs: spread(n, o.w - 1.8), o: wo, h: 1.9, y: 0.7 },
        b: { xs: spread(2, o.w - 3), o: { frame: 0x8a8580, sill: 0xa9a59c }, h: 1.4, y: 1.0 },
        ...(o.side ? { [o.side]: { xs: spread(sideN, o.d - 3), o: wo, h: 1.9, y: 0.7 } } : {}),
      });
    }
    face(k, 'f', o.w, o.d, (len) => {
      // piers with stone bases frame the shopfront; fascia with moulded edges carries the sign
      for (const s of [-1, 1]) {
        k.box(s * (len / 2 - 0.36), 0, 0.06, 0.72, H, 0.12, wall, mat);
        k.box(s * (len / 2 - 0.36), 0, 0.09, 0.8, 0.5, 0.18, STONE, 'concrete');
        k.box(s * (len / 2 - 0.36), y0 + h1 - 0.1, 0.09, 0.8, 0.22, 0.18, STONE, 'concrete');
      }
      const fy = y0 + h1 + 0.08;
      k.box(0, fy, 0.05, len - 1.5, band - 0.2, 0.1, trim);
      k.box(0, fy - 0.08, 0.1, len - 1.4, 0.1, 0.2, trim);
      k.box(0, fy + band - 0.24, 0.1, len - 1.4, 0.1, 0.2, trim);
      const [title, sub, bg, ink] = o.sign;
      signBoard(c, o.id, 0, fy + (band - 0.2) / 2 - 0.03, 0.16, Math.min(len - 2.2, 9), band - 0.5, bg, [
        { text: title, font: F_OS, weight: '800', color: ink, y: sub ? 0.42 : 0.54, size: sub ? 0.5 : 0.62, maxW: 0.9 },
        ...(sub ? [{ text: sub, font: F_OS, weight: '600', color: ink, y: 0.82, size: 0.2, maxW: 0.86, letter: 3 }] : []),
      ], { border: ink, lamps: Math.max(2, Math.round(len / 3.5)), frame: DARK });
      if (o.awn !== null) awning(k, 0, y0 + h1 - 0.02, len - 1.7, { a: o.awn?.[0] ?? 0xa9342b, b: o.awn?.[1] ?? 0xf3efe4, proj: 1.5, drop: 0.7 });
      const style = o.cornice ?? 'bracket';
      if (st === 2) k.box(0, y0 + h1 + band - 0.1, 0.07, len, 0.2, 0.14, STONE, 'concrete');
      cornice(k, -len / 2, len / 2, H - 0.45, { color: trim, h: 0.75, proj: 0.5, brackets: style === 'bracket' ? Math.max(3, Math.round(len / 1.6)) : 0, dentils: style === 'dentil', scallop: style === 'scallop' });
      if (o.blade) {
        signBoard(c, `${o.id}.blade`, len / 2 - 0.9, y0 + h1 + band + (st === 2 ? 1.2 : -0.2), 0.75, 1.3, 0.7, o.sign[2], [{ text: o.blade, font: F_OS, weight: '800', color: o.sign[3], y: 0.55, size: 0.5, maxW: 0.86 }], { ry: Math.PI / 2, twoSided: true, border: o.sign[3] });
        k.box(len / 2 - 0.9, y0 + h1 + band + (st === 2 ? 1.6 : 0.2), 0.4, 0.06, 0.06, 0.8, DARK, 'metal');
      }
      // step and mat at the door, wall lamp
      k.box(dx, 0, 0.35, 1.8, y0 - 0.02, 0.7, 0x9a968e, 'concrete');
      k.box(dx, y0 - 0.02, 0.3, 1.0, 0.02, 0.5, 0x4c3b2c);
    });
    // back wall: services, downpipe, a lean-to step, stains of use
    face(k, 'b', o.w, o.d, (len) => {
      services(k, -len / 2 + 1.2, H - 0.6);
      gutter(k, -len / 2 + 0.3, len / 2 - 0.3, H - 0.1, 0.02, 0x7d8082);
      k.box(-(o.w / 2 - 1.6), 0, 0.4, 1.4, y0 - 0.02, 0.8, 0x9a968e, 'concrete');
      if (!put(k, 'wall_light_box', -(o.w / 2 - 1.6), y0 + 2.5, 0)) {
        k.box(-(o.w / 2 - 1.6), y0 + 2.45, 0.08, 0.3, 0.16, 0.16, DARK, 'metal');
        k.box(-(o.w / 2 - 1.6), y0 + 2.42, 0.1, 0.22, 0.04, 0.12, 0xfff0c8, 'light');
      }
      if (st === 2 && !put(k, 'fire_escape', len / 4, y0 + h1 + band, 0)) {
        k.box(len / 4, y0 + h1 + band - 0.1, 0.55, 3.0, 0.08, 1.1, 0x3a3d40, 'metal');
        for (const s of [-1, 1]) k.box(len / 4 + s * 1.45, y0 + h1 + band, 1.05, 0.05, 1.0, 0.05, 0x3a3d40, 'metal');
        k.box(len / 4, y0 + h1 + band + 0.95, 1.05, 3.0, 0.05, 0.05, 0x3a3d40, 'metal');
        k.beam({ x: len / 4 - 1.3, y: 0.3, z: 0.9 }, { x: len / 4 + 1.0, y: y0 + h1 + band - 0.1, z: 0.9 }, 0.5, 0.06, 0x3a3d40, 'metal');
      }
    });
    parapetRoof(k, o.w, o.d, H, { wall, wallMat: mat, h: 0.6 });
    roofGear(k, rng, o.w, o.d, H, 2 + Math.floor(o.w / 6));
    void pilaster;
    void win;
    void door;
  });
}

const def = (o: ShopO): BuildingDef => ({ id: o.id, name: o.name, w: o.w, d: o.d, tags: ['main', o.inside ?? 'store'], build: (c, x, z, ry) => shop(c, x, z, ry, o) });

/** The Main Street row. Names are our own. */
export const SHOPS: BuildingDef[] = [
  def({ id: 'hardware', name: 'Pine Hollow Hardware', w: 13, d: 20, storeys: 2, sign: ['PINE HOLLOW HARDWARE', 'TOOLS · PAINT · FEED · EST. 1946', '#2c4a3e', '#f1e6c8'], awn: [0x2f5d4b, 0xf3efe4], frame: 0x2c4a3e, cornice: 'bracket', doorX: 0 }),
  def({ id: 'pharmacy', name: 'Corner Drug', w: 11, d: 18, storeys: 2, wallMat: 'brickTan', sign: ['CORNER DRUG', 'PRESCRIPTIONS · SODA FOUNTAIN', '#f4efe2', '#a3262e'], awn: [0xa3262e, 0xf3efe4], frame: 0x7a2a26, cornice: 'dentil', head: 'arch', blade: 'Rx', inside: 'cafe', look: { wall: 0xf1ead6, wains: 0x9c4a44 } }),
  def({ id: 'pawn', name: "Lucky's Pawn & Loan", w: 9, d: 17, wallMat: 'brickPaint', wall: 0xd9c9a3, sign: ["LUCKY'S PAWN & LOAN", 'WE BUY GOLD · GUITARS · TOOLS', '#e8c53c', '#1e1b18'], awn: null, frame: 0x1e1b18, cornice: 'plain', doorX: -2.2, look: { wall: 0xcfc7a8, wains: 0x4c4a44 } }),
  def({ id: 'tavern', name: 'The Rusty Spur', w: 10, d: 19, storeys: 2, wallMat: 'brickDark', sign: ['THE RUSTY SPUR', 'TAVERN · POOL · COLD BEER', '#3a2418', '#e9c27a'], awn: [0x5a2f22, 0xd9c7a0], frame: 0x3a2418, inside: 'bar', cornice: 'bracket', doorX: 2.4, head: 'hood', blade: 'BAR' }),
  def({ id: 'barber', name: "Earl's Barber Shop", w: 7.5, d: 15, wallMat: 'brickPaint', wall: 0xe9e4d6, sign: ["EARL'S BARBER SHOP", '', '#f4f1e8', '#27407a'], awn: [0x27407a, 0xf3efe4], frame: 0x27407a, cornice: 'dentil', doorX: 1.6, look: { wall: 0xdfe8ea, wains: 0x27407a, floor: 0xffffff, floorMat: 'checker' } }),
  def({ id: 'records', name: 'Spin Cycle Records', w: 8.5, d: 16, storeys: 2, wallMat: 'brickPurple', sign: ['SPIN CYCLE RECORDS', 'TAPES · LPs · TICKETS', '#201c2e', '#f2a23a'], awn: [0xd9662b, 0x201c2e], frame: 0x201c2e, cornice: 'scallop', doorX: -1.8, head: 'arch', look: { wall: 0x4a3f66, wains: 0x2a2438, floor: 0x6a5642 } }),
  def({ id: 'bakery', name: 'Rise & Shine Bakery', w: 8, d: 16, wallMat: 'brickPaint', wall: 0xf2dfc6, sign: ['RISE & SHINE BAKERY', 'BREAD · PIES · COFFEE', '#f7edd8', '#8a4a2a'], awn: [0xd98aa0, 0xf7efe2], frame: 0x8a4a2a, inside: 'cafe', cornice: 'scallop', doorX: 1.8, look: { wall: 0xf6e3c8, wains: 0xd98aa0 } }),
  def({ id: 'thrift', name: 'Second Chance Thrift', w: 12, d: 18, wallMat: 'brickBrown', sign: ['SECOND CHANCE THRIFT', 'CLOTHING · FURNITURE · BOOKS', '#27606a', '#f2ead2'], awn: [0x27606a, 0xf2ead2], frame: 0x1e3f44, cornice: 'plain', doorX: 0, look: { wall: 0xd6e0d2, wains: 0x27606a } }),
  def({ id: 'gazette', name: 'Pine Hollow Gazette', w: 9, d: 17, storeys: 2, wallMat: 'brickRed', sign: ['THE PINE HOLLOW GAZETTE', 'PRINTING · NEWS SINCE 1911', '#1f1d1b', '#e9e2cf'], awn: null, frame: 0x1f1d1b, inside: 'office', cornice: 'dentil', doorX: 2.2, head: 'lintel' }),
  def({ id: 'liquor', name: 'Hilltop Liquor', w: 9.5, d: 16, wallMat: 'stucco', wall: 0xe2d6b8, sign: ['HILLTOP LIQUOR', 'BEER · WINE · SPIRITS · ICE', '#a3262e', '#f6e9a8'], awn: [0xe0b83a, 0xa3262e], frame: 0x5a1e1c, cornice: 'plain', doorX: -2.4, look: { wall: 0xe6dcc0, wains: 0x7a2a26 } }),
  def({ id: 'laundry', name: 'Suds Laundromat', w: 10, d: 16, wallMat: 'brickPaint', wall: 0xcfe0e6, sign: ['SUDS LAUNDROMAT', 'OPEN 6 AM – 11 PM · DROP-OFF', '#2a6f9a', '#f4f4ee'], awn: [0x2a6f9a, 0xf4f4ee], frame: 0xd9dde0, doorCol: 0x2a6f9a, cornice: 'plain', doorX: 0, look: { wall: 0xdcecf0, wains: 0xf1f1ea, wainsMat: 'tiles', floor: 0xffffff, floorMat: 'checker' } }),
  def({ id: 'antiques', name: 'Attic Treasures Antiques', w: 10.5, d: 19, storeys: 2, wallMat: 'brickTan', sign: ['ATTIC TREASURES', 'ANTIQUES & COLLECTIBLES', '#4a2f4a', '#ecd9a6'], awn: [0x4a2f4a, 0xecd9a6], frame: 0x4a2f4a, cornice: 'bracket', doorX: -2.6, head: 'hood', side: 'r', look: { wall: 0xe4d2b0, wains: 0x6a4a34 } }),
  def({ id: 'insurance', name: 'Hollow Valley Insurance', w: 8, d: 15, wallMat: 'brickRed', sign: ['HOLLOW VALLEY INSURANCE', 'AUTO · FARM · HOME · LIFE', '#e9e2cf', '#22384f'], awn: [0x22384f, 0xe9e2cf], frame: 0x22384f, inside: 'office', cornice: 'dentil', doorX: 1.8 }),
  def({ id: 'video', name: 'Rewind Video Rental', w: 9, d: 15, wallMat: 'stucco', wall: 0xd8d2c4, sign: ['REWIND VIDEO', 'RENT 2 GET 1 FREE · VHS & BETA', '#1d2a6a', '#f2e24a'], awn: null, frame: 0x1d2a6a, cornice: 'plain', doorX: 2.3, look: { wall: 0x3f4a8a, wains: 0x1d2a6a, floor: 0x8a2f3a, floorMat: 'carpet' } }),
];

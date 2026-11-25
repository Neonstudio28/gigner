import type { Kit } from '../core/kit';
import type { Rng } from '../core/rng';
import type { Ctx } from '../buildings/common';
import type { BuildingDef } from '../buildings/catalog';
import { room, addZone } from '../buildings/interiors';
import { face, cornice, signBoard, WHITE, STONE, DARK, F_OS } from './kit2';
import { hull, upper, spread, put, partition, type Look, type Op } from './hull';
import { item, against, type Rect } from './furnish';
import { parapetRoof, roofGear, services, gutter, steps } from './parts';

const PI = Math.PI;
/** 1990s school interiors: painted block walls over a glazed wainscot, VCT floors, lay-in ceilings with troffers. */
const HALL: Look = { wall: 0xe8e2cf, wains: 0x7d8f6a, wainsH: 1.2, floor: 0xd8d2c2, floorMat: 'tiles', ceil: 0xf1efe8, ceilMat: 'ceilTile', lights: 'troffer', step: 3.2 };
const CLASS: Look = { ...HALL, wall: 0xf0ead6, wains: 0xb9a57a, floor: 0xcfc6b0 };
const GYM: Look = { wall: 0xe6dfc8, wains: 0x2f4f8a, wainsH: 1.8, floor: 0xc9965c, floorMat: 'woodFloor', ceil: 0xd9d6cc, ceilMat: 'ceilTile', lights: 'dome', step: 6 };
const CARPET: Look = { ...CLASS, floor: 0x5d6f8a, floorMat: 'carpet' };
const BRICK = 0xffffff;

const R = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 });
const cx = (r: Rect) => (r.x0 + r.x1) / 2;
const cz = (r: Rect) => (r.z0 + r.z1) / 2;
/** Paper on a wall facing into the room: a flat coloured sheet just proud of the wall plane. */
function paper(k: Kit, x: number, y: number, z: number, w: number, h: number, ry: number, col: number) {
  k.at(x, z, ry, () => k.box(0, y, 0.02, w, h, 0.01, col, 'paint', { cast: false }));
}
const ART = [0xf3d36b, 0x9fc5e8, 0xf4b6c2, 0xb6d7a8, 0xffffff, 0xf6b26b, 0xd5a6bd];

/** Classroom: rows of desks facing a chalkboard on the +z wall, teacher's desk, clock, flag, cork boards, cubbies or shelves. */
export function classroom(k: Kit, rng: Rng, r: Rect, o: { kids?: boolean; rows?: number; cols?: number } = {}) {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  against(k, r, 'f', 0.5, 'chalkboard', { off: 0.02 });
  item(k, 'teacher_desk', cx(r) + w * 0.28, r.z1 - 1.6, PI);
  item(k, 'office_chair', cx(r) + w * 0.28, r.z1 - 0.9, PI);
  put(k, 'wall_clock_school', cx(r) - w * 0.36, 0, r.z1 - 0.03, PI);
  put(k, 'flag_classroom', r.x1 - 0.03, 0, r.z1 - 0.8, -PI / 2);
  const cols = o.cols ?? Math.max(3, Math.floor((w - 2) / 1.35));
  const rows = o.rows ?? Math.max(3, Math.floor((d - 4.2) / 1.25));
  const sx = (w - 2) / cols;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      if (rng.chance(0.06)) continue;
      const x = r.x0 + 1 + sx * (i + 0.5);
      const z = r.z1 - 3.4 - j * 1.25;
      item(k, 'student_desk', x + rng.range(-0.06, 0.06), z, rng.range(-0.08, 0.08));
    }
  // back wall: cubbies for little ones, bookcases and a supply cabinet for older pupils
  if (o.kids) {
    against(k, r, 'b', 0.3, 'cubby_shelf');
    against(k, r, 'b', 0.72, 'cubby_shelf');
    item(k, 'rug_round', cx(r) - w * 0.25, r.z0 + 2.4, 0, { solid: false });
  } else {
    against(k, r, 'b', 0.25, 'bookshelf_low');
    against(k, r, 'b', 0.75, 'filing_cabinet_4');
  }
  against(k, r, 'b', 0.5, 'cork_board', { off: 0.02 });
  against(k, r, 'l', 0.5, 'cork_board', { off: 0.02 });
  item(k, o.kids ? 'globe_stand' : 'overhead_projector', r.x0 + 1, r.z0 + 1.1, 0.4);
  put(k, 'trash_bin_kitchen', r.x1 - 0.6, 0, r.z1 - 0.5);
  // children's drawings and posters along the side wall above the wainscot
  for (let i = 0; i < Math.floor(d / 1.1) - 1; i++) paper(k, r.x1 - 0.02, 1.35 + (i % 2) * 0.62, r.z0 + 1 + i * 1.05, 0.5, 0.42, -PI / 2, rng.pick(ART));
  // alphabet / times-table strip above the chalkboard
  for (let i = 0; i < Math.floor(w / 0.5) - 2; i++) paper(k, r.x0 + 1 + i * 0.5, 2.85, r.z1 - 0.02, 0.4, 0.3, PI, i % 2 ? 0xf1ede2 : 0xe3e8f2);
}

/** Library / media centre: double-faced stacks, reading tables, circulation desk, carpet, a reading corner. */
function library(k: Kit, rng: Rng, r: Rect) {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  for (let i = 0; i < Math.floor((w - 4) / 2.6); i++) {
    item(k, 'library_shelf', r.x0 + 3 + i * 2.6, r.z0 + 2.2, PI / 2);
    item(k, 'library_shelf', r.x0 + 3 + i * 2.6, r.z0 + 4.2, PI / 2);
  }
  for (let t = 0.12; t < 0.95; t += 0.18) against(k, r, 'b', t, 'bookshelf_full');
  for (let i = 0; i < 3; i++) {
    const x = r.x0 + 2.5 + i * 3.4;
    if (x > r.x1 - 5) break;
    item(k, 'dining_table_4', x, r.z1 - 3.2, rng.pick([0, PI / 2]));
  }
  item(k, 'reception_counter', r.x1 - 2.2, r.z1 - 2.2, PI);
  item(k, 'desk_setup', r.x1 - 2.2, r.z1 - 2.2, PI, { y: 1.1, solid: false });
  item(k, 'rug_rect', r.x1 - 3, cz(r) - 0.5, 0, { solid: false });
  item(k, 'armchair', r.x1 - 1.4, cz(r) - 1.4, -PI / 2);
  item(k, 'globe_stand', r.x0 + 1.2, r.z1 - 1.2);
  against(k, r, 'l', 0.6, 'cork_board', { off: 0.02 });
  item(k, 'potted_plant_2', r.x1 - 0.7, r.z0 + 0.7);
  void d;
}

/** Main office: reception counter facing the lobby, desks with typewriters and a computer, files, copier, mailboxes. */
function office(k: Kit, rng: Rng, r: Rect) {
  item(k, 'reception_counter', cx(r), r.z1 - 1.6, PI);
  item(k, 'desk_office', r.x0 + 1.6, cz(r) - 0.6, PI / 2);
  item(k, 'office_chair', r.x0 + 2.4, cz(r) - 0.6, -PI / 2);
  item(k, 'desk_office', r.x1 - 1.6, r.z0 + 1.8, 0);
  item(k, 'desk_setup', r.x1 - 1.6, r.z0 + 1.8, 0, { y: 0.76, solid: false });
  item(k, 'office_chair', r.x1 - 1.6, r.z0 + 2.6, PI);
  for (let t = 0.15; t < 0.6; t += 0.14) against(k, r, 'b', t, rng.chance(0.5) ? 'filing_cabinet_4' : 'filing_cabinet_2');
  against(k, r, 'l', 0.75, 'copier');
  against(k, r, 'r', 0.75, 'water_cooler');
  against(k, r, 'l', 0.3, 'notice_board', { off: 0.02 });
  put(k, 'wall_clock_school', cx(r), 0, r.z1 - 0.03, PI);
  for (const x of [r.x0 + 1.3, r.x0 + 2.2]) item(k, 'waiting_chair_row_3', x, r.z1 - 0.6, PI) || 0;
}

/** Hallway: steel locker banks between the doors on both corridor walls, a fountain, trophy case and fire gear. */
function lockers(k: Kit, x0: number, x1: number, z: number, ry: number, skip: number[], fountainAt?: number) {
  for (let x = x0 + 1.1; x < x1 - 1.1; x += 1.95) {
    if (skip.some((s) => Math.abs(s - x) < 1.7)) continue;
    if (fountainAt !== undefined && Math.abs(fountainAt - x) < 1) {
      item(k, 'water_fountain', x, z, ry, { solid: false });
      continue;
    }
    item(k, 'locker_bank', x, z, ry);
  }
}

/** Gym: sprung maple floor, hoops at both ends, roll-out bleachers along one side, mats, a scoreboard clock. */
function gym(k: Kit, rng: Rng, r: Rect, y0: number, o: { bleachers?: 1 | 2; stage?: boolean; tables?: boolean } = {}) {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  // court lines: centre circle, sidelines, baselines, keys
  const line = (x: number, z: number, lw: number, ld: number) => k.box(x, y0 + 0.005, z, lw, 0.01, ld, 0xf2efe6, 'paint', { cast: false });
  const L = Math.min(w - 2, 26);
  const B = Math.min(d - (o.bleachers ? 5 : 2), 14);
  const zc = o.bleachers === 1 ? cz(r) + 2 : cz(r);
  line(cx(r), zc - B / 2, L, 0.06);
  line(cx(r), zc + B / 2, L, 0.06);
  for (const s of [-1, 1]) {
    line(cx(r) + (s * L) / 2, zc, 0.06, B);
    line(cx(r) + s * (L / 2 - 2.9), zc, 0.06, 3.6);
    line(cx(r) + s * (L / 2 - 1.45), zc - 1.8, 2.9, 0.06);
    line(cx(r) + s * (L / 2 - 1.45), zc + 1.8, 2.9, 0.06);
    k.box(cx(r) + s * (L / 2 - 1.45), y0 + 0.004, zc, 2.9, 0.008, 3.6, 0x2f4f8a, 'paint', { cast: false });
  }
  line(cx(r), zc, 0.06, B);
  k.cyl(cx(r), y0 + 0.006, zc, 1.8, 1.8, 0.01, 24, 0x2f4f8a, 'paint', { cast: false });
  k.cyl(cx(r), y0 + 0.008, zc, 1.0, 1.0, 0.01, 20, 0xd8a93a, 'paint', { cast: false });
  put(k, 'basketball_backboard', r.x0 + 0.03, 0, zc, PI / 2);
  put(k, 'basketball_backboard', r.x1 - 0.03, 0, zc, -PI / 2);
  if (o.bleachers) {
    put(k, 'gym_bleachers', cx(r), 0, r.z0 + 2.2, 0, { solid: 3 });
    if (o.bleachers === 2) put(k, 'gym_bleachers', cx(r), 0, r.z1 - 2.2, PI, { solid: 3 });
  }
  if (o.stage) {
    // cafetorium stage across the +z end with a curtain and steps
    k.box(cx(r), y0, r.z1 - 2, w * 0.6, 0.9, 4, 0x8a5a36, 'woodFloor');
    k.solid(cx(r), r.z1 - 2, w * 0.6, 4, 0, 0.9);
    k.box(cx(r), y0 + 0.9, r.z1 - 0.3, w * 0.6, 3, 0.12, 0x7c221f, 'paint', { cast: false });
    for (const s of [-1, 1]) k.box(cx(r) + s * (w * 0.3 - 0.6), y0 + 0.9, r.z1 - 3.6, 1.2, 3, 0.15, 0x7c221f);
    item(k, 'piano_upright', cx(r) + w * 0.22, r.z1 - 5, PI);
  }
  if (o.tables) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) item(k, 'cafeteria_table', cx(r) - 6 + i * 4, cz(r) - 3 + j * 3, PI / 2 * 0);
  for (let i = 0; i < 4; i++) k.box(r.x0 + 1.2 + i * 1.3, y0, r.z1 - 0.5, 1.2, 0.08 + i * 0.05, 0.6, rng.pick([0x2f4f8a, 0xb3302a]), 'paint');
  put(k, 'wall_clock_school', cx(r), 1.6, r.z1 - 0.03, PI);
  put(k, 'exit_sign', r.x0 + 1, 2.4, r.z0 + 0.05);
}

/** Cafeteria: rows of fold-out tables, a serving line with sneeze guard and trays, milk cooler, vending, bins. */
function cafeteria(k: Kit, rng: Rng, r: Rect, kitchen = true) {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const nx = Math.floor((w - 3) / 4.2);
  const nz = Math.floor((d - (kitchen ? 6 : 2.5)) / 2.6);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) item(k, 'cafeteria_table', r.x0 + 2.6 + i * 4.2, r.z0 + 2 + j * 2.6, 0);
  if (kitchen) {
    // serving line along the +z wall: steam counter, glass guard, tray rail, register
    const zl = r.z1 - 1.6;
    k.box(cx(r), 0, zl, w * 0.5, 0.9, 0.8, 0xb9bcc0, 'metal');
    k.box(cx(r), 0.9, zl, w * 0.5, 0.04, 0.8, 0xdadde0, 'metal');
    k.box(cx(r), 1.25, zl - 0.25, w * 0.5, 0.02, 0.5, 0xcfe2ea, 'clear', { cast: false });
    k.box(cx(r), 0.78, zl - 0.55, w * 0.5, 0.04, 0.3, 0xb9bcc0, 'metal');
    k.solid(cx(r), zl - 0.1, w * 0.5, 1.1, 0, 1);
    for (let i = 0; i < 6; i++) k.box(cx(r) - w * 0.2 + i * w * 0.08, 0.94, zl, 0.5, 0.06, 0.32, rng.pick([0xc9a35a, 0x9a5a3a, 0xe0d39a, 0x6f8a3a]), 'paint');
    for (let i = 0; i < 8; i++) k.box(cx(r) - w * 0.25 - 0.6, 0.9 + i * 0.02, zl - 0.4, 0.45, 0.02, 0.35, 0xd9b06a, 'paint');
    item(k, 'cash_register', cx(r) + w * 0.25 + 0.2, zl, PI, { y: 0.92, solid: false });
    item(k, 'fridge_display_2door', r.x1 - 1.2, r.z1 - 0.6, PI);
    item(k, 'vending_soda', r.x0 + 0.8, r.z1 - 0.6, PI);
    item(k, 'vending_snack', r.x0 + 1.9, r.z1 - 0.6, PI);
  }
  for (const t of [0.2, 0.8]) against(k, r, 'b', t, 'trash_can_metal', { off: 0.2 });
  put(k, 'wall_clock_school', cx(r), 0.4, r.z0 + 0.03);
  for (let i = 0; i < Math.floor(w / 2.4); i++) k.at(r.x0 + 1.2 + i * 2.4, r.z0 + 0.04, 0, () => k.box(0, 2.6, 0, 1.6, 0.5, 0.01, ART[i % ART.length], 'paint', { cast: false }));
}

/** Restroom: toilet stalls with steel partitions, sinks under a mirror strip, paper towels. */
function restroom(k: Kit, r: Rect, n = 3) {
  const w = r.x1 - r.x0;
  const sw = Math.min(1.0, (w - 0.4) / n);
  for (let i = 0; i < n; i++) {
    const x = r.x0 + 0.2 + sw * (i + 0.5);
    item(k, 'toilet', x, r.z0 + 0.4, 0, { solid: 0.5 });
    k.box(x + sw / 2, 0.15, r.z0 + 0.8, 0.03, 1.7, 1.5, 0x8fa3b5, 'metal');
    k.box(x, 0.15, r.z0 + 1.55, sw - 0.1, 1.7, 0.03, 0x8fa3b5, 'metal');
    k.solid(x, r.z0 + 1.55, sw - 0.1, 0.04);
  }
  for (let i = 0; i < 3; i++) item(k, 'sink_pedestal', r.x0 + 0.7 + i * 0.85, r.z1 - 0.35, PI);
  k.box(r.x0 + 1.55, 1.15, r.z1 - 0.03, 2.6, 0.8, 0.02, 0xb9c8d0, 'chrome', { cast: false });
  k.box(r.x1 - 0.4, 1.2, r.z1 - 0.1, 0.3, 0.4, 0.12, 0xdadde0, 'metal');
}

/** Science lab: resin-topped benches with stools, a demo bench, fume cabinet, periodic table, safety shower. */
function lab(k: Kit, rng: Rng, r: Rect) {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  against(k, r, 'f', 0.5, 'chalkboard', { off: 0.02 });
  item(k, 'lab_bench', cx(r), r.z1 - 1.8, PI);
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < Math.floor((d - 5) / 2.6); j++) {
      const x = cx(r) + (i ? 1 : -1) * w * 0.22;
      const z = r.z1 - 4.4 - j * 2.6;
      item(k, 'lab_bench', x, z, 0);
      for (const s of [-0.7, 0, 0.7]) item(k, 'lab_stool', x + s, z + 0.7, rng.range(0, 6));
    }
  for (let t = 0.2; t < 0.9; t += 0.2) against(k, r, 'b', t, 'bookshelf_low');
  k.box(r.x1 - 0.6, 0, r.z0 + 1.4, 1.1, 2.2, 0.7, 0xc9cdd0, 'metal');
  k.box(r.x1 - 0.6, 1.0, r.z0 + 1.04, 0.9, 0.8, 0.02, 0x9fb8c0, 'clear', { cast: false });
  k.solid(r.x1 - 0.6, r.z0 + 1.4, 1.1, 0.7);
  paper(k, r.x0 + 0.02, 1.4, cz(r), 2.2, 1.2, PI / 2, 0xf1ede2);
  for (let i = 0; i < 18; i++) paper(k, r.x0 + 0.03, 2.4 - Math.floor(i / 9) * 0.12, cz(r) - 1 + (i % 9) * 0.25, 0.2, 0.1, PI / 2, ART[i % 7]);
  put(k, 'wall_clock_school', r.x0 + 0.03, 0.3, r.z1 - 2, PI / 2);
  item(k, 'teacher_desk', r.x0 + 1.4, r.z1 - 1.4, PI);
}

/** Art room: big shared tables, paint-spattered sink counter, drying rack and pupils' work on every wall. */
function artRoom(k: Kit, rng: Rng, r: Rect) {
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) item(k, 'dining_table_6', cx(r) - 2 + i * 4, cz(r) - 1.5 + j * 3, PI / 2);
  against(k, r, 'b', 0.3, 'kitchen_base_cabinet');
  against(k, r, 'b', 0.5, 'kitchen_sink_unit');
  against(k, r, 'b', 0.8, 'bookshelf_low');
  for (let i = 0; i < 12; i++) paper(k, r.x0 + 0.02, 1.4 + (i % 2) * 0.6, r.z0 + 1 + Math.floor(i / 2) * 1.1, 0.6, 0.45, PI / 2, rng.pick(ART));
}

/** Music room: risers of chairs facing a piano and music stands. */
function musicRoom(k: Kit, rng: Rng, r: Rect) {
  item(k, 'piano_upright', r.x0 + 1.5, r.z1 - 0.6, PI);
  item(k, 'piano_stool', r.x0 + 1.5, r.z1 - 1.3, 0);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) item(k, 'dining_chair', cx(r) - 3 + i * 1.1, r.z1 - 3 - j * 1.3, PI + rng.range(-0.1, 0.1));
  against(k, r, 'b', 0.5, 'bookshelf_low');
  put(k, 'wall_clock_school', cx(r), 0, r.z1 - 0.03, PI);
}

/** Nurse's office: cot, desk, cabinet and an eye chart. */
function nurse(k: Kit, r: Rect) {
  item(k, 'jail_bunk', r.x0 + 1.2, r.z0 + 1.1, PI / 2);
  item(k, 'desk_office', r.x1 - 1.4, r.z1 - 1.4, PI);
  against(k, r, 'l', 0.8, 'filing_cabinet_2');
  paper(k, r.x1 - 0.02, 1.2, cz(r), 0.4, 0.6, -PI / 2, 0xffffff);
  against(k, r, 'b', 0.8, 'sink_pedestal');
}

const ALU = 0x9aa0a6;
const WO = { frame: ALU, sill: STONE, mx: 3, my: 2, head: 'plain' } as const;
const winRow = (xs: number[], w = 2.4, h = 1.7, y = 0.9): Op[] => xs.map((x) => ({ x, w, y, h, kind: 'win' as const, win: WO }));
const sp = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 0.5)) / n);

/** Low concrete stoop with steps outside a door on side `s` of a w x d hull; `x` is the face's own coordinate. */
function stoop(k: Kit, s: 'f' | 'b', W: number, D: number, x: number, w: number, y0: number) {
  face(k, s, W, D, () => {
    k.box(x, 0, 0.8, w + 1.2, y0, 1.6, 0xb4b0a6, 'concrete');
    addZone(k, x, 0.8, w + 1.2, 1.7, y0);
    steps(k, x, 1.6 + Math.round(y0 / 0.17) * 0.3, w + 1.2, y0, { color: 0xb4b0a6, rail: DARK });
  });
}

/** Bands, coping and roof shared by both schools: cast-stone sill and head bands on the brick, parapet, roof units. */
function schoolShell(k: Kit, rng: Rng, W: number, D: number, y0: number, H: number) {
  for (const s of ['f', 'b', 'l', 'r'] as const)
    face(k, s, W, D, (len) => {
      k.box(0, y0 + 0.75, 0.05, len + 0.1, 0.16, 0.1, STONE, 'concrete');
      k.box(0, y0 + 2.75, 0.05, len + 0.1, 0.22, 0.1, STONE, 'concrete');
      k.box(0, y0 - 0.25, 0.06, len + 0.2, 0.25, 0.12, 0xb4b0a6, 'concrete');
      cornice(k, -len / 2, len / 2, H - 0.45, { h: 0.45, proj: 0.25, color: STONE });
    });
  parapetRoof(k, W, D, H, { h: 0.8, cap: STONE });
  roofGear(k, rng, W, D, H, 6);
  face(k, 'b', W, D, (len) => {
    services(k, -len / 2 + 2, H - 1);
    gutter(k, -len / 2 + 0.4, len / 2 - 0.4, H - 0.2, 0.02, 0x8a8d90);
  });
}

/** Front entrance: flat canopy on square columns, glazed double doors, the school's name in letters above. */
function entrance(c: Ctx, k: Kit, D: number, y0: number, h: number, w: number, key: string, name: string, col: string) {
  const zf = D / 2;
  k.box(0, 0, zf + 2.4, w + 2, y0, 4.8, 0xb4b0a6, 'concrete');
  addZone(k, 0, zf + 2.4, w + 2, 4.9, y0);
  steps(k, 0, zf + 4.8 + Math.round(y0 / 0.17) * 0.32, w + 2, y0, { color: 0xb4b0a6, rail: DARK });
  for (const s of [-1, 1]) {
    k.box(s * (w / 2 + 0.5), y0, zf + 4.2, 0.45, h - 0.6, 0.45, 0x8e4a3a, 'brickRed');
    k.solid(s * (w / 2 + 0.5), zf + 4.2, 0.45, 0.45);
  }
  k.box(0, y0 + h - 0.6, zf + 2.3, w + 1.8, 0.45, 4.8, WHITE, 'paint');
  k.box(0, y0 + h - 0.62, zf + 2.3, w + 1.6, 0.02, 4.6, 0xfff4dc, 'light', { cast: false });
  signBoard(c, key, 0, y0 + h - 0.38, zf + 4.72, w + 1.2, 0.36, col, [{ text: name, font: F_OS, weight: '700', color: '#f4efe0', y: 0.55, size: 0.7, maxW: 0.95, letter: 4 }], { frame: WHITE });
}

/**
 * Pine Hollow Elementary: one-storey 1960s brick school, remodelled in the '90s. Front row of classrooms, office,
 * lobby and library on a cross corridor; behind it the cafetorium with its stage, restrooms, kitchen, more classrooms
 * and the nurse, music and art rooms reached by a side corridor.
 */
function elementary(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 64;
  const D = 32;
  const y0 = 0.5;
  const h = 4.0;
  const H = y0 + h + 0.4;
  c.occ.add(x, z, W, D, ry, 1.5, false);
  k.at(x, z, ry, () => {
    const f: Op[] = [
      { x: 0, w: 2.4, h: 2.5, kind: 'door', color: ALU, door: { double: true, transom: 0.6 } },
      { x: -2.6, w: 1.5, y: 0.3, h: 2.6, kind: 'win', win: { ...WO, mx: 1, my: 3 } },
      { x: 2.6, w: 1.5, y: 0.3, h: 2.6, kind: 'win', win: { ...WO, mx: 1, my: 3 } },
      ...winRow([...sp(-31.7, -21.5, 3), ...sp(-21.5, -11.3, 3), -7.6, ...sp(4, 19, 4), ...sp(19, 31.7, 3)]),
    ];
    // back (building x): cafetorium exit, side-corridor exit, high cafetorium windows, rear-room windows
    const b: Op[] = [
      { x: -20, w: 1.8, h: 2.3, kind: 'door', color: 0x2f4f8a, door: { double: true } },
      { x: 29.7, w: 1.1, h: 2.2, kind: 'door', color: 0x2f4f8a },
      ...winRow([-29, -25, -15, -11], 2.2, 0.9, 2.6),
      ...winRow([2, 11.5, 22.3], 2.2),
    ];
    const l: Op[] = winRow([...sp(6, 15.7, 2), ...sp(-15.7, 2, 3)], 2.2, 1.6, 0.9);
    const r: Op[] = winRow([...sp(-15.7, -6, 2), -2, ...sp(6, 15.7, 2)].map((v) => -v), 2.2, 1.6, 0.9);
    hull(k, { w: W, d: D, y0, h, wall: BRICK, wallMat: 'brickRed', look: HALL, f, b, l, r, base: 0xb4b0a6, t: 0.35 });
    const P = (x0: number, z0: number, x1: number, z1: number, L: Look, doors: { at: number; w?: number; leaf?: number }[] = []) => partition(k, x0, z0, x1, z1, y0, h, L, doors);
    const leaf = 0x8a6a48;
    P(-31.7, 6, 31.7, 6, CLASS, [{ at: 5.1, leaf }, { at: 15.3, leaf }, { at: 24.1, leaf }, { at: 31.7, w: 7.6 }, { at: 43.2, w: 1.8 }, { at: 57.05, leaf }]);
    for (const px of [-21.5, -11.3, 19]) P(px, 6, px, 15.65, CLASS);
    P(-4, 6, -4, 15.65, CLASS, [{ at: 6.5, leaf }]);
    P(4, 6, 4, 15.65, CLASS);
    P(-31.7, 2, 31.7, 2, CLASS, [{ at: 3.7, w: 1.8 }, { at: 21.7, w: 1.8 }, { at: 25.2 }, { at: 28.2 }, { at: 34.65, leaf }, { at: 44.55, leaf }, { at: 54.45, leaf }, { at: 61.7, w: 3.8 }]);
    P(-8, 2, -8, -15.65, GYM, [{ at: 12.5, leaf }]);
    P(-5, 2, -5, -6, CLASS);
    P(-2, 2, -2, -15.65, CLASS);
    P(-8, -6, 27.7, -6, CLASS, [{ at: 10, leaf }, { at: 20, leaf }, { at: 30, leaf }]);
    for (const px of [7.9, 17.8]) P(px, 2, px, -6, CLASS);
    for (const px of [6, 17]) P(px, -6, px, -15.65, CLASS);
    P(27.7, 2, 27.7, -15.65, HALL, [{ at: 4, leaf }, { at: 13, leaf }]);
    room(k, y0, () => {
      classroom(k, rng, R(-31.4, 6.2, -21.7, 15.4), { kids: true });
      classroom(k, rng, R(-21.3, 6.2, -11.5, 15.4), { kids: true });
      office(k, rng, R(-11.1, 6.2, -4.2, 15.4));
      library(k, rng, R(4.2, 6.2, 18.8, 15.4));
      classroom(k, rng, R(19.2, 6.2, 31.4, 15.4), { kids: true });
      classroom(k, rng, R(-1.8, -5.8, 7.7, 1.8), { kids: true, rows: 3 });
      classroom(k, rng, R(8.1, -5.8, 17.6, 1.8), { rows: 3 });
      classroom(k, rng, R(18, -5.8, 27.5, 1.8), { rows: 3 });
      gym(k, rng, R(-31.4, -15.4, -8.2, 1.8), 0, { tables: true });
      restroom(k, R(-7.8, -5.8, -5.1, 1.8), 2);
      restroom(k, R(-4.9, -5.8, -2.2, 1.8), 2);
      nurse(k, R(-1.8, -15.4, 5.8, -6.2));
      musicRoom(k, rng, R(6.2, -15.4, 16.8, -6.2));
      artRoom(k, rng, R(17.2, -15.4, 27.5, -6.2));
      // kitchen behind the cafetorium
      const kr = R(-7.8, -15.4, -2.2, -6.2);
      against(k, kr, 'l', 0.3, 'stove_oven');
      against(k, kr, 'r', 0.3, 'fridge_80s');
      against(k, kr, 'b', 0.5, 'kitchen_sink_unit');
      // lobby: trophy case, display board, benches, mats; corridor: cubby hooks, fountains, fire gear
      item(k, 'trophy_case', 3.2, 14.9, PI);
      put(k, 'notice_board', -3.85, 0, 11, PI / 2);
      item(k, 'bench_plain', 2.9, 10, -PI / 2);
      k.box(0, 0.01, 13.8, 3, 0.02, 2.2, 0x3a4a5a, 'carpet', { cast: false });
      for (const fx of [-18, 12]) item(k, 'water_fountain', fx, 2.25, 0, { solid: false });
      for (const fx of [-25, 22]) put(k, 'fire_alarm_box', fx, 0, 5.9, PI);
      for (let i = 0; i < 28; i++) k.at(-30 + i * 2.2, 5.92, PI, () => k.box(0, 1.4, 0, 0.8, 0.6, 0.01, ART[i % 7], 'paint', { cast: false }));
      put(k, 'exit_sign', 0, 2.7, 15.55, PI);
    });
    schoolShell(k, rng, W, D, y0, H);
    entrance(c, k, D, y0, h, 6, 'pine_elem', 'PINE HOLLOW ELEMENTARY SCHOOL', '#1f2f55');
    stoop(k, 'b', W, D, 20, 1.8, y0);
    stoop(k, 'b', W, D, -29.7, 1.1, y0);
  });
}

/**
 * Hollow County High School: two-storey brick block. Ground floor: classrooms, admin office, trophy lobby and library
 * on a locker-lined corridor; cafeteria with serving line and kitchen, restrooms, two science labs. The upper storey
 * is closed (windows only). The gym is its own building beside it.
 */
function highSchool(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 84;
  const D = 36;
  const y0 = 0.5;
  const h = 3.8;
  const H = y0 + h + 3.6;
  c.occ.add(x, z, W, D, ry, 1.5, false);
  k.at(x, z, ry, () => {
    const front = [...sp(-41.65, -31, 3), ...sp(-31, -20.3, 3), ...sp(-20.3, -8, 3), ...sp(8, 24, 4), ...sp(24, 33, 2), ...sp(33, 41.65, 2)];
    const f: Op[] = [
      { x: 0, w: 3.0, h: 2.5, kind: 'door', color: ALU, door: { double: true, transom: 0.6 } },
      ...[-5, -3, 3, 5].map((wx) => ({ x: wx, w: 1.6, y: 0.3, h: 2.6, kind: 'win' as const, win: { ...WO, mx: 1, my: 3 } })),
      ...winRow(front),
    ];
    const b: Op[] = [
      { x: -28, w: 1.8, h: 2.3, kind: 'door', color: 0x7c221f, door: { double: true } },
      { x: -10, w: 2.2, h: 2.5, kind: 'door', color: 0x7d8187 },
      ...winRow([...sp(-41.65, -30, 2), ...sp(-26, -14, 2), ...sp(0, 14, 3), ...sp(14, 28, 3), ...sp(28, 41.65, 3)]),
    ];
    const side = (zs: number[], m: number) => winRow(zs.map((v) => v * m), 2.2, 1.6, 0.9);
    hull(k, { w: W, d: D, y0, h, wall: BRICK, wallMat: 'brickRed', look: HALL, f, b, l: side([11, -5, -12], 1), r: side([11, -5, -12], -1), base: 0xb4b0a6, t: 0.35 });
    const P = (x0: number, z0: number, x1: number, z1: number, L: Look, doors: { at: number; w?: number; leaf?: number }[] = []) => partition(k, x0, z0, x1, z1, y0, h, L, doors);
    const leaf = 0x6f5238;
    P(-41.65, 5, 41.65, 5, CLASS, [{ at: 5.35, leaf }, { at: 16, leaf }, { at: 27.65, w: 1.8 }, { at: 41.65, w: 15.6 }, { at: 57.65, w: 1.8 }, { at: 70.15, leaf }, { at: 78.95, leaf }]);
    for (const px of [-31, -20.3, -8, 8, 24, 33]) P(px, 5, px, 17.6, CLASS);
    P(-41.65, 1, 41.65, 1, CLASS, [{ at: 11.65, w: 2.4 }, { at: 23.65, w: 2.4 }, { at: 37.15 }, { at: 40.15 }, { at: 48.65, leaf }, { at: 62.65, leaf }, { at: 76.45, leaf }]);
    P(-14, 1, -14, -17.6, CLASS, [{ at: 9, w: 1.4 }]);
    for (const px of [-6, -3, 0, 14, 28]) P(px, 1, px, -17.6, CLASS);
    room(k, y0, () => {
      classroom(k, rng, R(-41.4, 5.2, -31.2, 17.4));
      classroom(k, rng, R(-30.8, 5.2, -20.5, 17.4));
      office(k, rng, R(-20.1, 5.2, -8.2, 17.4));
      library(k, rng, R(8.2, 5.2, 23.8, 17.4));
      classroom(k, rng, R(24.2, 5.2, 32.8, 17.4), { cols: 5 });
      classroom(k, rng, R(33.2, 5.2, 41.4, 17.4), { cols: 5 });
      cafeteria(k, rng, R(-41.4, -17.4, -14.2, 0.8));
      const kr = R(-13.8, -17.4, -6.2, 0.8);
      for (const t of [0.2, 0.45, 0.7]) against(k, kr, 'l', t, 'stove_oven');
      against(k, kr, 'r', 0.3, 'fridge_80s');
      against(k, kr, 'r', 0.6, 'fridge_80s');
      against(k, kr, 'b', 0.5, 'kitchen_sink_unit');
      item(k, 'kitchen_base_cabinet', -10, -8, 0);
      restroom(k, R(-5.8, -17.4, -3.2, 0.8), 2);
      restroom(k, R(-2.8, -17.4, -0.2, 0.8), 2);
      lab(k, rng, R(0.2, -17.4, 13.8, 0.8));
      lab(k, rng, R(14.2, -17.4, 27.8, 0.8));
      classroom(k, rng, R(28.2, -17.4, 41.4, 0.8));
      // the long hall: lockers both sides between the doors, fountains, banners, trophy cases in the lobby
      const doorsF = [-36.3, -25.65, -14, 16, 28.5, 37.3];
      const doorsB = [-30, -18, -4.5, -1.5, 7, 21, 34.8];
      lockers(k, -41.65, -8, 4.75, PI, doorsF, -22);
      lockers(k, 8, 41.65, 4.75, PI, doorsF, 30);
      lockers(k, -41.65, 41.65, 1.25, 0, doorsB, 0);
      for (const tx of [-6, 6]) item(k, 'trophy_case', tx, 17.2, PI);
      put(k, 'notice_board', -7.85, 0, 11, PI / 2);
      put(k, 'notice_board', 7.85, 0, 11, -PI / 2);
      for (let i = 0; i < 6; i++) k.at(-35 + i * 14, 4.9, PI, () => k.box(0, 2.9, 0, 2.6, 0.7, 0.01, i % 2 ? 0x7c221f : 0xd8a93a, 'paint', { cast: false }));
      for (const fx of [-38, 0, 38]) put(k, 'fire_alarm_box', fx, 0, 1.15, 0);
      put(k, 'exit_sign', 0, 2.6, 17.55, PI);
    });
    upper(k, W, D, y0 + h, 3.6, BRICK, 'brickRed', {
      f: { xs: front, o: WO, w: 2.4, h: 1.7, y: 0.9 },
      b: { xs: sp(-41.65, 41.65, 16), o: WO, w: 2.4, h: 1.7, y: 0.9 },
      l: { xs: sp(-17.6, 17.6, 5), o: WO, w: 2.2, h: 1.6, y: 0.9 },
      r: { xs: sp(-17.6, 17.6, 5), o: WO, w: 2.2, h: 1.6, y: 0.9 },
    });
    schoolShell(k, rng, W, D, y0, H);
    entrance(c, k, D, y0, h, 8, 'hollow_hs', 'HOLLOW COUNTY HIGH SCHOOL', '#7c221f');
    stoop(k, 'b', W, D, 28, 1.8, y0);
    k.at(0, -D / 2, PI, () => {
      k.box(10, 0, 2, 6, 1.1, 4, 0xb4b0a6, 'concrete');
      k.solid(10, 2, 6, 4, 0, 1.1);
    });
  });
}

/** High-school gymnasium: tall brick box, maple court, bleachers on both sides, hoops, banners, team name outside. */
function hsGym(c: Ctx, x: number, z: number, ry: number) {
  const { kit: k, rng } = c;
  const W = 36;
  const D = 30;
  const y0 = 0.3;
  const h = 8;
  c.occ.add(x, z, W, D, ry, 1.5, false);
  k.at(x, z, ry, () => {
    const hi = (xs: number[]) => winRow(xs, 2.6, 1.4, 5.6);
    hull(k, { w: W, d: D, y0, h, wall: BRICK, wallMat: 'brickBrown', look: GYM, f: [{ x: 0, w: 2.4, h: 2.4, kind: 'door', color: 0x7c221f, door: { double: true } }, ...hi(sp(-17.6, 17.6, 6))], b: [{ x: 12, w: 1.8, h: 2.3, kind: 'door', color: 0x7c221f, door: { double: true } }, ...hi(sp(-17.6, 17.6, 6))], l: hi(sp(-14.6, 14.6, 5)), r: hi(sp(-14.6, 14.6, 5)), base: 0xb4b0a6, t: 0.35 });
    room(k, y0, () => {
      gym(k, rng, R(-17.4, -14.4, 17.4, 14.4), 0, { bleachers: 2 });
      for (let i = 0; i < 5; i++) k.at(-12 + i * 6, 14.6, PI, () => k.box(0, 5, 0, 1.6, 2.2, 0.02, i % 2 ? 0xd8a93a : 0x7c221f, 'paint', { cast: false }));
    });
    parapetRoof(k, W, D, y0 + h, { h: 0.8, cap: STONE });
    roofGear(k, rng, W, D, y0 + h, 3);
    signBoard(c, 'hs_gym', 0, y0 + 3.6, D / 2 + 0.06, 14, 1.2, '#7c221f', [{ text: 'HOME OF THE COUGARS', font: F_OS, weight: '700', color: '#f4efe0', y: 0.55, size: 0.6, maxW: 0.95, letter: 4 }], { frame: WHITE });
    stoop(k, 'f', W, D, 0, 2.4, y0);
    stoop(k, 'b', W, D, -12, 1.8, y0);
  });
}

export const SCHOOLS: BuildingDef[] = [
  { id: 'elementary', name: 'Pine Hollow Elementary School', w: 64, d: 32, front: 16, door: 0, tags: ['school'], build: elementary },
  { id: 'high_school', name: 'Hollow County High School', w: 84, d: 36, front: 18, door: 0, tags: ['school'], build: highSchool },
  { id: 'hs_gym', name: 'Hollow County High Gymnasium', w: 36, d: 30, front: 15, door: 0, tags: ['school'], build: hsGym },
];
void spread;
void DARK;

import type { Place } from './places';

/** What someone does with the hours of the day. */
export type Block = 'sleep' | 'home' | 'work' | 'free' | 'lunch' | 'school' | 'church' | 'bar' | 'patrol';
export interface Role {
  id: string;
  title: string;
  /** Models that fit, and the place definitions they can work at. */
  models: string[];
  at?: RegExp;
  /** [from hour, block] entries, sorted; the last one runs to midnight and wraps into the first. */
  day: [number, Block][];
  /** Things done while at work (see acts.ts). */
  jobs: string[];
  /** Keeps the uniform colours of the model. */
  uniform?: boolean;
}

const OFFICE: [number, Block][] = [[0, 'sleep'], [6.5, 'home'], [8.2, 'work'], [12, 'lunch'], [13, 'work'], [17.2, 'free'], [21.5, 'home'], [23, 'sleep']];
const SHOP: [number, Block][] = [[0, 'sleep'], [6.3, 'home'], [7.6, 'work'], [12.5, 'lunch'], [13.2, 'work'], [19.5, 'free'], [22, 'home'], [23.3, 'sleep']];
const EARLY: [number, Block][] = [[0, 'sleep'], [4.8, 'home'], [5.6, 'work'], [11.5, 'lunch'], [12.2, 'work'], [15.5, 'free'], [20.5, 'home'], [22, 'sleep']];
const LATE: [number, Block][] = [[0, 'work'], [2, 'sleep'], [10, 'home'], [11.5, 'free'], [15, 'work']];
const IDLE: [number, Block][] = [[0, 'sleep'], [7.5, 'home'], [9, 'free'], [12.3, 'lunch'], [13.2, 'free'], [20.5, 'home'], [22.5, 'sleep']];
const OLD: [number, Block][] = [[0, 'sleep'], [5.8, 'home'], [7, 'free'], [9.5, 'church'], [10.5, 'free'], [12, 'lunch'], [13, 'home'], [15, 'free'], [19, 'home'], [21, 'sleep']];
const KID: [number, Block][] = [[0, 'sleep'], [7, 'home'], [8.2, 'school'], [14.8, 'free'], [19, 'home'], [20.5, 'sleep']];
const TEEN: [number, Block][] = [[0, 'sleep'], [7.4, 'home'], [8.3, 'school'], [15.2, 'free'], [22, 'home'], [23.5, 'sleep']];
const NIGHT: [number, Block][] = [[0, 'bar'], [1.5, 'sleep'], [10, 'home'], [11, 'free'], [18, 'bar']];
const WATCH: [number, Block][] = [[0, 'sleep'], [5.5, 'home'], [6.5, 'patrol'], [12, 'lunch'], [12.8, 'patrol'], [18.5, 'free'], [21.5, 'home'], [23, 'sleep']];
const WATCH_N: [number, Block][] = [[0, 'patrol'], [6.5, 'home'], [8, 'sleep'], [15, 'home'], [16, 'free'], [18.5, 'patrol']];

export const ROLES: Role[] = [
  { id: 'deputy', title: 'Deputy', models: ['sheriff_deputy_m', 'sheriff_deputy_m', 'sheriff_deputy_f'], at: /^sheriff$/, day: WATCH, jobs: ['patrol', 'watch', 'ticket', 'desk', 'chat'], uniform: true },
  { id: 'deputy_n', title: 'Night deputy', models: ['sheriff_deputy_m', 'sheriff_deputy_f'], at: /^sheriff$/, day: WATCH_N, jobs: ['patrol', 'watch', 'desk'], uniform: true },
  { id: 'agent', title: 'Federal agent', models: ['agent_m', 'agent_f'], at: /^(sheriff|courthouse)$/, day: OFFICE, jobs: ['watch', 'phone', 'desk', 'chat'], uniform: true },
  { id: 'clerk', title: 'Shopkeeper', models: ['shopkeeper', 'casual_f_1', 'casual_m_2', 'shopkeeper', 'casual_f_3'], at: /^(hardware|pharmacy|pawn|barber|records|thrift|liquor|laundry|antiques|video|grocery|motel|bakery|donut)$/, day: SHOP, jobs: ['counter', 'tidy', 'sweep', 'stock', 'ledger', 'smoke'] },
  { id: 'cook', title: 'Cook', models: ['cook'], at: /^(diner|lakeCafe|donut|bakery|tavern)$/, day: EARLY, jobs: ['cook', 'tidy', 'stock', 'smoke'], uniform: true },
  { id: 'server', title: 'Waitress', models: ['waitress'], at: /^(diner|lakeCafe|tavern)$/, day: SHOP, jobs: ['serve', 'tidy', 'counter', 'serve', 'smoke'], uniform: true },
  { id: 'barkeep', title: 'Bartender', models: ['shopkeeper', 'biker'], at: /^tavern$/, day: LATE, jobs: ['counter', 'tidy', 'serve', 'stock'] },
  { id: 'banker', title: 'Bank teller', models: ['businessman', 'businesswoman'], at: /^bank$/, day: OFFICE, jobs: ['desk', 'counter', 'ledger', 'phone'] },
  { id: 'official', title: 'Town clerk', models: ['businesswoman', 'businessman', 'teacher_f'], at: /^(townhall|courthouse)$/, day: OFFICE, jobs: ['desk', 'ledger', 'phone', 'chat'] },
  { id: 'reporter', title: 'Reporter', models: ['casual_m_1', 'casual_f_2', 'businesswoman'], at: /^gazette$/, day: OFFICE, jobs: ['ledger', 'phone', 'desk', 'rounds'] },
  { id: 'broker', title: 'Insurance agent', models: ['businessman', 'businesswoman'], at: /^insurance$/, day: OFFICE, jobs: ['desk', 'phone', 'ledger'] },
  { id: 'priest', title: 'Pastor', models: ['priest'], at: /^church$/, day: OLD, jobs: ['pray', 'chat', 'read', 'sweep'], uniform: true },
  { id: 'mechanic', title: 'Mechanic', models: ['mechanic'], at: /^(gas|factory|machineShed)$/, day: SHOP, jobs: ['fix', 'tidy', 'stock', 'smoke', 'watch'], uniform: true },
  { id: 'attendant', title: 'Station attendant', models: ['shopkeeper', 'teen_m'], at: /^gas$/, day: SHOP, jobs: ['counter', 'sweep', 'tidy', 'watch'] },
  { id: 'farmer', title: 'Farmer', models: ['farmer', 'rancher', 'farmer'], at: /^barn$/, day: EARLY, jobs: ['rake', 'garden', 'haul', 'fix', 'watch'], uniform: true },
  { id: 'logger', title: 'Sawyer', models: ['lumberjack', 'lumberjack', 'worker'], at: /^sawmill$/, day: EARLY, jobs: ['haul', 'fix', 'stock', 'watch', 'smoke'], uniform: true },
  { id: 'hand', title: 'Warehouse hand', models: ['worker', 'worker', 'trucker'], at: /^(warehouse|factory)$/, day: EARLY, jobs: ['haul', 'stock', 'ledger', 'fix', 'smoke'], uniform: true },
  { id: 'foreman', title: 'Yard foreman', models: ['businessman', 'worker'], at: /^(lumberOffice|warehouse)$/, day: OFFICE, jobs: ['ledger', 'phone', 'watch', 'chat'] },
  { id: 'angler', title: 'Fishing guide', models: ['fisherman'], at: /^baitShop$/, day: EARLY, jobs: ['counter', 'fish', 'stock', 'fish'], uniform: true },
  { id: 'mail', title: 'Mail carrier', models: ['mailman'], day: SHOP, jobs: ['rounds'], uniform: true },
  { id: 'nurse', title: 'Nurse', models: ['nurse'], at: /^pharmacy$/, day: SHOP, jobs: ['counter', 'ledger', 'rounds'], uniform: true },
  { id: 'fire', title: 'Firefighter', models: ['firefighter'], at: /^townhall$/, day: WATCH, jobs: ['watch', 'patrol', 'chat', 'fix'], uniform: true },
  { id: 'teacher', title: 'Teacher', models: ['teacher_f'], at: /^(church|townhall)$/, day: OFFICE, jobs: ['read', 'ledger', 'chat'] },
  { id: 'jogger', title: 'Runner', models: ['jogger'], day: IDLE, jobs: [], uniform: true },
  { id: 'tourist', title: 'Tourist', models: ['tourist', 'casual_f_2', 'casual_m_3'], day: IDLE, jobs: [] },
  { id: 'biker', title: 'Biker', models: ['biker'], day: NIGHT, jobs: [], uniform: true },
  { id: 'trucker', title: 'Trucker', models: ['trucker'], day: NIGHT, jobs: [], uniform: true },
  { id: 'kid', title: 'Kid', models: ['kid_m', 'kid_f'], day: KID, jobs: [] },
  { id: 'teen', title: 'Teenager', models: ['teen_m', 'teen_f'], day: TEEN, jobs: [] },
  { id: 'elder', title: 'Retiree', models: ['old_man', 'old_woman'], day: OLD, jobs: [] },
  { id: 'local', title: 'Local', models: ['casual_m_1', 'casual_m_2', 'casual_m_3', 'casual_f_1', 'casual_f_2', 'casual_f_3'], day: IDLE, jobs: [] },
  { id: 'commuter', title: 'Office worker', models: ['businessman', 'businesswoman', 'casual_m_1', 'casual_f_1'], day: OFFICE, jobs: ['desk', 'phone', 'ledger'] },
];
export const role = (id: string) => ROLES.find((r) => r.id === id)!;

/** Staff a business takes on, by place definition: [role, how many]. */
export const STAFF: [RegExp, [string, number][]][] = [
  [/^sheriff$/, [['deputy', 4], ['deputy_n', 2], ['agent', 1]]],
  [/^courthouse$/, [['official', 3], ['agent', 1]]],
  [/^townhall$/, [['official', 3], ['fire', 2], ['teacher', 1]]],
  [/^bank$/, [['banker', 3]]],
  [/^church$/, [['priest', 1], ['teacher', 1]]],
  [/^diner$/, [['cook', 1], ['server', 2]]],
  [/^lakeCafe$/, [['cook', 1], ['server', 1]]],
  [/^donut$/, [['clerk', 1], ['cook', 1]]],
  [/^tavern$/, [['barkeep', 1], ['server', 1]]],
  [/^gas$/, [['mechanic', 1], ['attendant', 1]]],
  [/^grocery$/, [['clerk', 3]]],
  [/^pharmacy$/, [['nurse', 1]]],
  [/^(hardware|pawn|barber|records|thrift|liquor|laundry|antiques|video|bakery|motel)$/, [['clerk', 1]]],
  [/^gazette$/, [['reporter', 1]]],
  [/^insurance$/, [['broker', 1]]],
  [/^baitShop$/, [['angler', 2]]],
  [/^barn$/, [['farmer', 2]]],
  [/^sawmill$/, [['logger', 5]]],
  [/^lumberOffice$/, [['foreman', 1]]],
  [/^warehouse$/, [['hand', 3], ['foreman', 1]]],
  [/^factory$/, [['hand', 5], ['mechanic', 1]]],
];
/** Everyone else in town: [role, how many]. */
export const EXTRAS: [string, number][] = [['mail', 2], ['jogger', 4], ['tourist', 9], ['biker', 3], ['trucker', 3], ['kid', 10], ['teen', 9], ['elder', 16], ['local', 54], ['commuter', 10]];

/** The block of the day a role is in at a given hour. */
export function blockAt(day: [number, Block][], hour: number): Block {
  let b = day[day.length - 1][1];
  for (const [from, blk] of day) {
    if (hour >= from) b = blk;
    else break;
  }
  return b;
}

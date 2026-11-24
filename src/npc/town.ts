import * as THREE from 'three';
import { Rng } from '../world/core/rng';
import type { Doorway, Zone } from '../world/buildings/interiors';
import type { Post } from './posts';
import type { Nav } from './nav';
import { npcLib } from './lib';
import { NpcBody, type NpcTints } from './body';
import { buildPlaces, wayIn, type Place, type Site, type Spot } from './places';
import { ROLES, STAFF, EXTRAS, role, blockAt, type Role } from './cast';
import { JOBS, LEISURE, type Act } from './acts';
import { Agent, type Car, type Ctx, type Env, type Talk } from './agent';
import { FIRST_M, FIRST_F, LAST, SKIN, HAIR, GREY, CLOTH, LEGS } from './names';

export interface TownSource {
  nav: Nav;
  sites: Site[];
  doors: Doorway[];
  rooms: Zone[];
  posts: Post[];
  movers: () => Car[];
}
const POSE: Record<string, Act> = {
  stand: { say: 'passing the time', beats: [{ c: ['idle_shift', 'look_around'], t: [12, 40] }] },
  talk: { say: 'chatting', beats: [{ c: ['hips', 'idle_shift'], t: [10, 30] }] },
  hips: { say: 'passing the time', beats: [{ c: 'hips', t: [14, 40] }, { c: 'look_around', t: [5, 9] }] },
  cross: { say: 'standing about', beats: [{ c: 'cross', t: [14, 40] }, { c: 'look_around', t: [5, 9] }] },
  point: { say: 'pointing something out', beats: [{ c: 'point' }, { c: 'hips', t: [8, 20] }, { c: 'point' }] },
  wave: { say: 'waving to someone', beats: [{ c: 'wave' }, { c: 'idle_shift', t: [8, 20] }] },
  carry: { say: 'carrying a load', beats: [{ c: 'carry_box', p: 'box', t: [4, 10], keep: true }, { c: 'putdown', p: 'box' }, { c: 'stretch' }] },
  lean: { say: 'taking it easy', beats: [{ c: 'lean', t: [20, 50] }] },
  sit: { say: 'sitting a while', beats: [{ c: ['sit', 'sit_read', 'sit_drink'], t: [30, 90] }] },
  stride: { say: 'heading out', beats: [{ c: 'idle', t: [0.2, 3] }] },
};
const OUTDOOR = /^(bench|park|beach|pier|angle|play|hang|stroll|jog|sights|visit|yard)$/;
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** The people of the town: who they are, where they live and work, and the loop that runs their day. */
export class Townsfolk {
  readonly group = new THREE.Group();
  enabled = true;
  readonly agents: Agent[] = [];
  readonly places: Place[];
  readonly talks: Talk[] = [];
  readonly env: Env = { hour: 10, rain: 0, night: 0, flash: 0 };
  /** Hours since the town woke up (never wraps). */
  clock = 0;
  private rng = new Rng(9151);
  private nav: Nav;
  private ctx: Ctx;
  private hash = new Map<number, Agent[]>();
  private byKind = new Map<string, Place[]>();
  private frame = 0;
  private wasRain = 0;
  private wasFlash = 0;
  private last: { x: number; z: number } | null = null;
  private slow = 0;
  stats = { near: 0, shown: 0, talks: 0, ms: 0 };

  constructor(src: TownSource) {
    this.group.name = 'townsfolk';
    this.nav = src.nav;
    const rand = () => this.rng.next();
    this.places = buildPlaces(src.nav, src.sites, src.doors, src.rooms, src.posts, rand);
    for (const p of this.places) {
      const l = this.byKind.get(p.kind);
      if (l) l.push(p);
      else this.byKind.set(p.kind, [p]);
    }
    this.ctx = {
      nav: src.nav,
      env: this.env,
      cars: [],
      player: null,
      rand,
      around: (x, z, r) => this.around(x, z, r),
      think: (a) => this.think(a),
      spot: (a, p, where, seat) => this.spot(a, p, where, seat),
      clock: () => this.clock,
    };
    this.movers = src.movers;
    this.populate();
  }
  private movers: () => Car[];

  private make(r: Role, work: Place | null, model?: string) {
    const lib = npcLib()!;
    const rng = this.rng;
    const m = model ?? rng.pick(r.models);
    const meta = lib.man.characters[m];
    const female = meta?.sex === 'f';
    const tints: NpcTints = {};
    const pal = meta?.palette ?? {};
    if (rng.chance(0.75)) tints.skin = hex(rng.pick(SKIN));
    if ('hair' in pal) tints.hair = hex(r.id === 'elder' || (rng.chance(0.12) && r.id !== 'kid' && r.id !== 'teen') ? rng.pick(GREY) : rng.pick(HAIR));
    if (!r.uniform) {
      for (const slot of ['shirt', 'jacket', 'dress'] as const) if (slot in pal && rng.chance(0.8)) tints[slot] = hex(rng.pick(CLOTH));
      if ('pants' in pal && rng.chance(0.7)) tints.pants = hex(rng.pick(LEGS));
    }
    const homes = this.byKind.get('home')?.filter((h) => h.out) ?? [];
    let home: Place | null = null;
    if (/^(tourist|biker|trucker)$/.test(r.id)) home = this.byKind.get('lodging')?.[0] ?? null;
    else if (homes.length) {
      const near = work ? [...homes].sort((a, b) => Math.hypot(a.x - work.x, a.z - work.z) - Math.hypot(b.x - work.x, b.z - work.z)).slice(0, 14) : homes;
      home = rng.pick(near);
    }
    const body = new NpcBody(m, tints, lib);
    const a = new Agent(
      this.agents.length,
      `${rng.pick(female ? FIRST_F : FIRST_M)} ${rng.pick(LAST)}`,
      r,
      body,
      { hunger: rng.range(0.1, 0.6), energy: rng.range(0.5, 1), social: rng.range(0.2, 0.8), fun: rng.range(0.2, 0.7), errand: rng.range(0, 0.7) },
      { social: rng.next(), active: rng.next(), careful: rng.next(), late: rng.range(-0.5, 0.7), umbrella: rng.chance(0.4), smoker: rng.chance(0.3) },
      home,
      work,
      new Set(),
    );
    if (/^(banker|official|broker|commuter|agent)$/.test(r.id) && rng.chance(0.6)) a.carry = 'briefcase';
    body.group.visible = false;
    this.group.add(body.group);
    this.agents.push(a);
    return a;
  }

  /** Puts an agent on a spot, doing something there without having to walk to it first. */
  private seatAt(a: Agent, p: Place, s: Spot, act: Act) {
    s.by = a.id;
    a.spot = s;
    a.x = s.x;
    a.y = s.y;
    a.z = s.z;
    a.h = s.ry ?? this.rng.range(0, 6.28);
    a.seated = s.seat;
    a.inside = s.indoor;
    a.place = s.indoor ? p : null;
    a.target = p;
    p.here++;
    a.act = act;
    a.say = act.say;
    a.goal = 'post';
    a.beat = -1;
    a.rounds = 1;
    a.next(this.ctx);
  }

  private populate() {
    const rng = this.rng;
    for (const p of this.places) {
      if (!p.out && !p.yard.length) continue;
      const staff = STAFF.find(([re]) => re.test(p.def));
      if (staff) for (const [id, n] of staff[1]) for (let i = 0; i < n; i++) this.make(role(id), p);
    }
    for (const [id, n] of EXTRAS) for (let i = 0; i < n; i++) this.make(role(id), null);
    // the people the town was laid out with: whoever fits the post starts on it
    const placed = new Set<Agent>();
    const rings = new Map<number, Agent[]>();
    const loose = /^(local|tourist|teen|elder|commuter|biker|trucker)$/;
    for (const p of this.places) {
      for (const s of p.yard) {
        const post = s.post;
        if (!post?.model || Number.isNaN(this.nav.grid.floor(s.ax ?? s.x, s.az ?? s.z, s.y))) continue;
        const free = this.agents.filter((a) => !placed.has(a));
        let a: Agent | undefined;
        if (post.model === 'any') a = free.find((c) => loose.test(c.role.id) && (!s.seat || c.role.id !== 'kid'));
        else a = free.find((c) => c.body.model === post.model && c.work === p) ?? free.find((c) => c.body.model === post.model && loose.test(c.role.id));
        if (!a) a = this.make(post.model === 'any' ? role('local') : (ROLES.find((r) => !r.at && r.models.includes(post.model!)) ?? role('local')), null, post.model === 'any' ? undefined : post.model);
        placed.add(a);
        if (post.carry) a.carry = post.carry;
        this.seatAt(a, p, s, POSE[s.seat ? 'sit' : (post.pose ?? 'stand')] ?? POSE.stand);
        a.lost = !this.nav.reachable({ x: s.ax ?? s.x, y: s.y, z: s.az ?? s.z });
        if (s.ring !== undefined) {
          const l = rings.get(s.ring);
          if (l) l.push(a);
          else rings.set(s.ring, [a]);
        }
      }
    }
    for (const members of rings.values()) if (members.length > 1) this.startTalk(members, rng.range(25, 90));
    // everyone else starts where the hour finds them
    for (const a of this.agents) {
      if (placed.has(a)) continue;
      const b = blockAt(a.role.day, (this.env.hour - a.traits.late + 24) % 24);
      const at = b === 'work' || b === 'patrol' ? a.work : b === 'sleep' || b === 'home' ? a.home : null;
      const s = at?.inn ? this.spot(a, at, 'in', false) : null;
      if (s && at) {
        this.seatAt(a, at, s, POSE.stride);
        continue;
      }
      const c = at?.out ?? a.home?.out ?? { x: rng.range(-250, 250), z: rng.range(-60, 60) };
      const n = this.nav.wander(c.x, c.z, 90, () => rng.next()) ?? this.nav.wander(0, 0, 400, () => rng.next());
      if (!n) continue;
      a.x = n.x + rng.range(-0.3, 0.3);
      a.y = n.y;
      a.z = n.z + rng.range(-0.3, 0.3);
      a.h = rng.range(0, 6.28);
      a.idle(rng.range(0, 5));
    }
    // who knows whom: the people you work with, the people you live with, and a couple more
    for (const a of this.agents) {
      for (const o of this.agents) if (o !== a && ((a.work && o.work === a.work) || (a.home && o.home === a.home && a.home.kind === 'home'))) a.friends.add(o.id);
      for (let i = 0; i < 2; i++) {
        const o = rng.pick(this.agents);
        if (o !== a) {
          a.friends.add(o.id);
          o.friends.add(a.id);
        }
      }
    }
  }

  /** A free spot at a place, claimed for the agent (nearest few first). */
  private spot(a: Agent, p: Place, where: 'in' | 'yard', seat: boolean): Spot | null {
    if (where === 'yard' && !p.yard.length && p.out && p.door.length > 1) {
      // nowhere laid out to stand outside: make room either side of the door
      const i = p.door[1];
      const d = Math.hypot(p.out.x - i.x, p.out.z - i.z) || 1;
      const ox = (p.out.x - i.x) / d;
      const oz = (p.out.z - i.z) / d;
      for (const [side, fwd] of [[2.2, 0.3], [-2.2, 0.3], [3.4, 1], [-3.4, 1], [1.6, 1.8], [-1.6, 1.8]]) {
        const x = p.out.x + oz * side + ox * fwd;
        const z = p.out.z - ox * side + oz * fwd;
        const c = this.nav.grid.probe(x, z, p.out.y);
        if (Number.isNaN(c.f) || c.road || !this.nav.grid.straight(p.out, { x, y: c.f, z })) continue;
        p.yard.push({ x, y: c.f, z, ry: Math.atan2(ox, oz) + this.rng.range(-0.5, 0.5), seat: false, by: -1, indoor: false });
        if (p.yard.length >= 3) break;
      }
    }
    const list = where === 'in' ? p.spots : p.yard;
    let best: Spot | null = null;
    let score = Infinity;
    for (const s of list) {
      if (s.by !== -1 || s.seat !== seat) continue;
      const k = Math.hypot(s.x - a.x, s.z - a.z) * (0.4 + this.rng.next());
      if (k >= score || (s.indoor && !wayIn(this.nav, p, s))) continue;
      best = s;
      score = k;
    }
    if (best) best.by = a.id;
    return best;
  }

  /** Agents within r of a point. */
  around(x: number, z: number, r: number): Agent[] {
    const out: Agent[] = [];
    for (let i = Math.floor((x - r) / 2); i <= Math.floor((x + r) / 2); i++) {
      for (let j = Math.floor((z - r) / 2); j <= Math.floor((z + r) / 2); j++) {
        const cell = this.hash.get(i * 8192 + j);
        if (cell) for (const a of cell) if (Math.hypot(a.x - x, a.z - z) <= r) out.push(a);
      }
    }
    return out;
  }

  /** The nearest few usable places of a kind (or matching a definition), one picked at random. */
  private pick(a: Agent, kind: string | RegExp, indoor = true): Place | null {
    const hr = this.env.hour;
    const list = typeof kind === 'string' ? (this.byKind.get(kind) ?? []) : this.places.filter((p) => kind.test(p.def));
    const ok = list
      .filter((p) => (indoor ? p.out && p.spots.length : p.out || p.yard.length) && (a.avoid.get(p.id) ?? -1) < this.clock)
      .filter((p) => (p.open[1] > 24 ? hr >= p.open[0] || hr < p.open[1] - 24 : hr >= p.open[0] && hr < p.open[1]) && p.here < p.spots.length + p.yard.length + 2)
      .sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z));
    return ok.length ? ok[Math.floor(this.rng.next() ** 2 * Math.min(3, ok.length))] : null;
  }

  /** Decides what the agent does next: the hour sets the frame, and in free time the strongest want wins. */
  private think(a: Agent) {
    const env = this.env;
    const rng = this.rng;
    const hr = (env.hour - a.traits.late + 24) % 24;
    const id = a.role.id;
    let b = blockAt(a.role.day, hr);
    const usable = (p: Place | null): p is Place => !!p && !!(p.out || p.yard.length) && (a.avoid.get(p.id) ?? -1) < this.clock;
    const go = (goal: string, act: Act | undefined, place: Place | null) => {
      if (!act) return a.idle(2);
      const wet = env.rain > 0.3 && !a.traits.umbrella && !a.inside;
      a.hurry = wet || ((goal === 'home' || goal === 'sleep') && env.night > 0.8 && rng.chance(0.5));
      a.begin(goal, act, place, this.ctx);
    };
    if (a.lost && !a.inside) {
      // nowhere to go from here: work or idle on the spot, with short walks round about
      const job = JOBS[a.role.jobs.length ? rng.pick(a.role.jobs) : ''];
      const beats = (job ?? LEISURE.stroll).beats.map((x) => ({ ...x, go: x.go ? ('walk' as const) : undefined, sit: false }));
      beats.push({ c: ['look_around', 'idle_shift', 'stretch', 'hips'], t: [5, 16], go: 'walk', sit: false });
      return a.begin(job ? rng.pick(a.role.jobs) : 'stroll', { say: job?.say ?? 'pottering about', beats, rounds: [1, 2] }, null, this.ctx);
    }
    const home = usable(a.home) ? a.home : null;
    if (b === 'sleep') return home ? go('sleep', LEISURE.sleep, home) : go('stroll', LEISURE.stroll, null);
    if (b === 'home') {
      if (home) return env.rain < 0.2 && env.night < 0.4 && rng.chance(0.25) ? go('yard', LEISURE.yard, home) : go('home', LEISURE.home, home);
      b = 'free';
    }
    if (b === 'work' || b === 'patrol') {
      const jobs = a.role.jobs;
      if (jobs.length && (usable(a.work) || id === 'mail')) {
        const job = b === 'patrol' && rng.chance(0.6) ? 'patrol' : rng.pick(jobs);
        return go(job, JOBS[job], a.work);
      }
      b = 'free';
    }
    if (b === 'school') {
      const p = this.pick(a, /^(church|townhall)$/);
      if (p) return go('school', LEISURE.school, p);
      b = 'free';
    }
    if (b === 'church') {
      const p = this.pick(a, 'church');
      if (p) return go('church', LEISURE.church, p);
      b = 'free';
    }
    if (b === 'bar') {
      const p = this.pick(a, 'bar');
      if (p) return go('bar', LEISURE.bar, p);
      b = 'free';
    }
    // free time (and lunch): score every want and follow the strongest
    const n = a.needs;
    const t = a.traits;
    const grown = id !== 'kid' && id !== 'teen';
    const day = hr > 8 && hr < 19.5;
    const opts: [string, Place | null, number][] = [];
    const add = (goal: string, place: Place | null, w: number, needsPlace = true) => {
      if (w <= 0 || (needsPlace && !place)) return;
      let s = w * (0.7 + rng.next() * 0.6);
      if (place) s /= 1 + Math.hypot(place.x - a.x, place.z - a.z) / (goal === 'home' ? 220 : 110);
      if (OUTDOOR.test(goal)) s *= (env.rain > 0.3 ? (t.umbrella ? 0.4 : 0.04) : 1) * (env.night > 0.6 ? 0.3 : 1);
      opts.push([goal, place, s]);
    };
    add('eat', this.pick(a, 'food'), 0.15 + n.hunger * 1.5 + (b === 'lunch' ? 0.9 : 0));
    add('shop', this.pick(a, 'shop'), grown ? n.errand * 1.3 : 0.1);
    add('bench', this.pick(a, rng.chance(0.5) ? 'park' : 'street', false), (1 - n.energy) * 0.9 + (id === 'elder' ? 0.6 : 0.15));
    add('park', this.pick(a, 'park', false), 0.2 + n.fun * 0.4);
    add('beach', this.pick(a, 'beach', false), day ? (id === 'tourist' ? 0.9 : 0.25) + n.fun * 0.5 : 0);
    add('pier', this.pick(a, 'pier', false), 0.2 + n.fun * 0.3);
    add('angle', this.pick(a, 'pier', false), /^(angler|elder|farmer)$/.test(id) ? 0.5 : 0.05);
    add('play', this.pick(a, 'play', false), id === 'kid' ? 1.3 : 0);
    add('hang', this.pick(a, rng.chance(0.5) ? 'street' : /^(donut|gas|video|records)$/, false), id === 'teen' ? 1 : 0.1);
    add('stroll', null, 0.25 + t.active * 0.5, false);
    add('jog', null, id === 'jogger' ? 1.4 : t.active > 0.85 ? 0.3 : 0, false);
    add('sights', null, id === 'tourist' ? 1 : 0, false);
    if (a.friends.size && n.social > 0.4) {
      const f = this.agents[[...a.friends][Math.floor(rng.next() * a.friends.size)]];
      if (f?.home && f.home.kind === 'home' && usable(f.home)) add('visit', f.home, n.social * 0.7 * t.social);
    }
    add('bar', this.pick(a, 'bar'), grown && hr > 16.5 ? 0.25 + n.social * 0.5 + (/^(biker|trucker|logger|hand)$/.test(id) ? 0.6 : 0) : 0);
    add('church', this.pick(a, 'church'), id === 'elder' ? 0.3 : 0.04);
    add('home', home, 0.05 + (1 - n.energy) * 0.6 + env.night * 1.8 + (env.rain > 0.3 ? 0.5 : 0) + (a.carry === 'shopping_bag' ? 0.5 : 0));
    if (env.rain > 0.3 && !a.inside && !t.umbrella) add('shelter', this.pick(a, /^(diner|donut|grocery|church|townhall|hardware|pharmacy|bakery|gas|motel)$/), 2.2);
    opts.sort((p, q) => q[2] - p[2]);
    const best = opts[0];
    if (!best) return a.idle(3);
    const [goal, place] = best;
    if (goal === 'eat') n.hunger = 0.05;
    else if (goal === 'shop') n.errand = 0;
    else if (goal === 'bench' || goal === 'home') n.energy = Math.min(1, n.energy + 0.4);
    if (OUTDOOR.test(goal) || goal === 'bar') n.fun *= 0.45;
    // the shopping does not go everywhere: it is dropped off on the way to anything but home
    if (goal !== 'home' && a.carry === 'shopping_bag') a.carry = '';
    go(goal, LEISURE[goal], place);
  }

  private startTalk(members: Agent[], dur: number) {
    const t: Talk = { members: [...members], t: dur, speaker: 0, swap: 0, x: 0, z: 0 };
    for (const m of members) {
      m.joinTalk(t);
      t.x += m.x / members.length;
      t.z += m.z / members.length;
    }
    this.talks.push(t);
    return t;
  }

  private runTalks(dt: number) {
    const rng = this.rng;
    for (let i = this.talks.length - 1; i >= 0; i--) {
      const t = this.talks[i];
      t.members = t.members.filter((m) => m.talk === t && m.state === 'talk');
      if ((t.t -= dt) <= 0 || t.members.length < 2 || this.env.rain > 0.5) {
        for (const m of t.members) {
          m.leaveTalk();
          m.cool = rng.range(30, 90);
          m.needs.social *= 0.3;
          for (const o of t.members) if (o !== m) m.friends.add(o.id);
          if (rng.chance(0.4)) m.react(rng.chance(0.5) ? 'wave' : 'nod', 1.6);
        }
        this.talks.splice(i, 1);
        continue;
      }
      if ((t.swap -= dt) <= 0) {
        t.swap = rng.range(3, 7);
        t.speaker = Math.floor(rng.next() * t.members.length);
        const laugh = rng.chance(0.18);
        t.members.forEach((m, k) => {
          const sp = k === t.speaker;
          const clip = m.seated ? (sp ? 'sit_talk' : 'sit') : laugh ? 'laugh' : sp ? rng.pick(['talk_a', 'talk_b', 'talk_a', 'point', 'shrug']) : rng.pick(['listen', 'listen', 'nod', 'hips', 'cross']);
          m.body.play(clip, 0.35, clip === 'nod' || clip === 'point' || clip === 'shrug');
          m.body.hold(null);
        });
      }
      const sp = t.members[t.speaker] ?? t.members[0];
      for (const m of t.members) {
        if (m.seated) continue;
        const to = m === sp ? t : sp;
        let d = Math.atan2(to.x - m.x, to.z - m.z) - m.h;
        d = ((((d + Math.PI) % 6.2832) + 6.2832) % 6.2832) - Math.PI;
        m.h += d * Math.min(1, dt * 4);
      }
    }
  }

  /** People who pass each other may stop to talk, or join friends already talking. */
  private mingle(a: Agent) {
    if (a.cool > 0 || a.inside || a.hurry || a.crossing || !(a.state === 'walk' || a.approachable) || this.env.rain > 0.3) return;
    const rng = this.rng;
    for (const o of this.around(a.x, a.z, 2)) {
      if (o === a || o.inside || o.cool > 0 || Math.abs(o.y - a.y) > 0.6) continue;
      const friend = a.friends.has(o.id);
      const want = ((a.traits.social + o.traits.social) / 2) * (friend ? 1 : 0.2) * (0.3 + (a.needs.social + o.needs.social) / 2);
      if (o.state === 'talk' && o.talk && o.talk.members.length < 4 && friend && rng.chance(want)) {
        o.talk.members.push(a);
        a.joinTalk(o.talk);
        return;
      }
      if (!(o.approachable || (o.state === 'walk' && !o.hurry && !o.crossing))) continue;
      if (Math.hypot(o.x - a.x, o.z - a.z) < 0.7 || !rng.chance(want * 0.6)) {
        // not stopping: a nod to a friend in passing
        if (friend && rng.chance(0.3)) {
          a.lookAt = o;
          a.lookT = 2;
        }
        a.cool = o.cool = 6;
        continue;
      }
      this.startTalk([a, o], rng.range(14, 45));
      return;
    }
  }

  /** Cars: step back from one that is about to hit, hurry out of the way of one that is coming. */
  private wary(a: Agent) {
    if (a.inside || a.seated) return;
    for (const c of this.ctx.cars) {
      if (c.v < 2.5) continue;
      const dx = a.x - c.x;
      const dz = a.z - c.z;
      const ahead = dx * c.fx + dz * c.fz - c.hl;
      if (ahead < 0 || ahead > Math.max(12, c.v * 4)) continue;
      const side = dx * c.fz - dz * c.fx;
      if (Math.abs(side) < 1.9 && ahead / c.v < 1.1) {
        if (a.state === 'talk') a.leaveTalk();
        if (a.react(a.traits.careful > 0.8 ? 'cower' : 'flinch', 1.2, c)) {
          const k = side >= 0 ? 3 : -3;
          a.shove = { x: c.fz * k, z: -c.fx * k, t: 0.5 };
          a.cool = 20;
        }
        return;
      }
      if (a.crossing && Math.abs(side) < 5 && ahead / c.v < 4) a.rush = a.hurry = true;
    }
  }

  /** Where everyone is (the player cannot walk through them). */
  positions() {
    return this.agents;
  }
  /** The person nearest a point, with what there is to know about them. */
  nearest(x: number, z: number, r: number, y?: number) {
    let best: Agent | null = null;
    let bd = r;
    for (const a of this.around(x, z, r)) {
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < bd && (y === undefined || Math.abs(a.y - y) < 1.5)) {
        best = a;
        bd = d;
      }
    }
    return best ? { agent: best, name: best.name, title: best.role.title + (best.work ? `, ${best.work.name}` : ''), say: best.state === 'talk' ? 'chatting' : best.state === 'walk' && best.say ? `${best.say} (on the way)` : best.say || 'passing the time' } : null;
  }
  info() {
    const by: Record<string, number> = {};
    let inside = 0;
    for (const a of this.agents) {
      by[a.state] = (by[a.state] ?? 0) + 1;
      if (a.inside) inside++;
    }
    return { people: this.agents.length, places: this.places.length, hour: +this.env.hour.toFixed(2), states: by, inside, fails: this.agents.reduce((s, a) => s + a.fails, 0), ...this.stats };
  }

  update(dt: number, camera?: THREE.Vector3, player?: { x: number; y?: number; z: number } | null, env?: Partial<Env> & { driving?: boolean }) {
    if (!this.enabled || dt <= 0) return;
    const t0 = performance.now();
    const e = this.env;
    const rng = this.rng;
    const hours = dt * 0.02;
    this.clock += hours;
    e.hour = env?.hour !== undefined && !Number.isNaN(env.hour) ? env.hour : (e.hour + hours) % 24;
    e.rain = env?.rain ?? 0;
    e.night = env?.night ?? (e.hour < 5.5 || e.hour > 20.5 ? 1 : 0);
    e.flash = env?.flash ?? 0;
    const ctx = this.ctx;
    ctx.cars = this.movers();
    if (player) {
      const vx = this.last ? (player.x - this.last.x) / dt : 0;
      const vz = this.last ? (player.z - this.last.z) / dt : 0;
      const v = Math.min(60, Math.hypot(vx, vz));
      ctx.player = { x: player.x, y: player.y ?? 0, z: player.z, vx, vz, driving: !!env?.driving };
      if (env?.driving) ctx.cars.push({ x: player.x, z: player.z, fx: v > 0.5 ? vx / Math.hypot(vx, vz) : 0, fz: v > 0.5 ? vz / Math.hypot(vx, vz) : 1, v, hl: 2.3 });
      this.last = { x: player.x, z: player.z };
    } else ctx.player = this.last = null;
    this.nav.tick();
    this.hash.clear();
    for (const a of this.agents) {
      const k = Math.floor(a.x / 2) * 8192 + Math.floor(a.z / 2);
      const c = this.hash.get(k);
      if (c) c.push(a);
      else this.hash.set(k, [a]);
    }
    const rainStart = e.rain > 0.3 && this.wasRain <= 0.3;
    const thunder = e.flash > 0.5 && this.wasFlash <= 0.5;
    this.wasRain = e.rain;
    this.wasFlash = e.flash;
    this.frame++;
    this.slow += dt;
    const social = this.frame % 20 === 0;
    const st = this.stats;
    st.near = st.shown = 0;
    const onRoad: { x: number; z: number }[] = [];
    const p = ctx.player;
    for (const a of this.agents) {
      const d = camera ? Math.hypot(a.x - camera.x, a.z - camera.z) : 0;
      const lod = d < 90 ? 0 : d < 230 ? 1 : 2;
      a.lod = lod;
      const g = a.body.group;
      g.visible = lod < 2;
      const n = a.needs;
      n.hunger = Math.min(1, n.hunger + hours / 7);
      n.energy = Math.max(0, n.energy - hours / 16);
      n.social = Math.min(1, n.social + hours / 4);
      n.fun = Math.min(1, n.fun + hours / 5);
      n.errand = Math.min(1, n.errand + hours / 9);
      if (lod === 2) {
        // out of sight: live at a sixth of the rate
        if ((this.frame + a.id) % 6 === 0) a.update(Math.min(0.6, dt * 6), ctx);
        if (a.crossing) onRoad.push(a);
        continue;
      }
      st.shown++;
      if (lod === 0) st.near++;
      a.update(dt, ctx);
      a.pose(dt);
      a.body.shadows = d < 55;
      if (a.crossing) onRoad.push(a);
      if (lod === 0) this.wary(a);
      if (a.inside) continue;
      if (rainStart) {
        if (!a.seated && rng.chance(0.6)) a.react('look_sky', 1.5 + rng.next() * 1.5);
        // nobody without an umbrella stays out in it
        if ((!a.traits.umbrella || a.seated) && a.state !== 'walk' && a.state !== 'route') {
          if (a.state === 'talk') a.leaveTalk();
          a.wet = 2 + rng.next() * 5;
        }
      }
      if (a.wet > 0 && (a.wet -= dt) <= 0 && a.state !== 'walk' && a.state !== 'route' && e.rain > 0.3) a.idle(0.1);
      if (thunder && rng.chance(0.3)) a.react('flinch', 1.1);
      if (social && lod === 0) {
        this.mingle(a);
        if (p && !p.driving && a.cool <= 0 && Math.abs(p.y - a.y) < 1.2) {
          const pd = Math.hypot(p.x - a.x, p.z - a.z);
          if (pd < 0.55 && a.state === 'beat' && !a.seated) {
            if (a.react('sidestep', 0.8, p)) a.shove = { x: ((a.x - p.x) / (pd || 1)) * 1.4, z: ((a.z - p.z) / (pd || 1)) * 1.4, t: 0.6 };
            a.cool = 4;
          } else if (pd < 3.2 && (a.approachable || a.state === 'walk') && !a.hurry) {
            a.lookAt = p;
            a.lookT = 3.5;
            if (a.approachable && rng.chance(0.5)) a.react(rng.chance(0.5) ? 'wave' : 'nod', 1.8, p);
            a.cool = rng.range(25, 60);
          }
        }
      }
    }
    this.runTalks(dt);
    this.walkers = onRoad;
    st.talks = this.talks.length;
    st.ms += (performance.now() - t0 - st.ms) * 0.1;
  }
  /** People out on a carriageway this frame (traffic brakes for them). */
  walkers: { x: number; z: number }[] = [];

  dispose() {
    for (const a of this.agents) a.body.dispose();
  }
}

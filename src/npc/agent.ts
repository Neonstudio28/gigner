import type { NpcBody } from './body';
import type { Nav, RoutePt } from './nav';
import type { P3 } from './grid';
import type { Place, Spot } from './places';
import type { Role } from './cast';
import type { Act, Beat } from './acts';

export interface Env {
  hour: number;
  rain: number;
  night: number;
  flash: number;
}
export interface Car {
  x: number;
  z: number;
  /** Unit forward vector and speed (m/s). */
  fx: number;
  fz: number;
  v: number;
  hl: number;
}
export interface Needs {
  hunger: number;
  energy: number;
  social: number;
  fun: number;
  errand: number;
}
export interface Traits {
  /** 0..1: chatty, restless, careful. */
  social: number;
  active: number;
  careful: number;
  /** Hours this person's clock runs behind the town's. */
  late: number;
  umbrella: boolean;
  smoker: boolean;
}
/** What the agent needs from the town around it. */
export interface Ctx {
  nav: Nav;
  env: Env;
  cars: Car[];
  player: { x: number; y: number; z: number; vx: number; vz: number; driving: boolean } | null;
  rand: () => number;
  around: (x: number, z: number, r: number) => Agent[];
  /** Picks what to do next (sets goal, act and place). */
  think: (a: Agent) => void;
  /** A free spot at a place, claimed for the agent. */
  spot: (a: Agent, p: Place, where: 'in' | 'yard', seat: boolean) => Spot | null;
  /** Hours since the town woke up (does not wrap at midnight). */
  clock: () => number;
}
export type State = 'think' | 'route' | 'walk' | 'beat' | 'talk' | 'react';
interface Leg extends RoutePt {
  /** Passing this point takes the walker indoors (true) or back out (false). */
  inside?: boolean;
}

const TAU = Math.PI * 2;
const turn = (from: number, to: number, max: number) => {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return from + Math.max(-max, Math.min(max, d));
};
const IDLE_PROP: Record<string, string> = { box: 'carry_box', umbrella: 'idle', briefcase: 'idle', shopping_bag: 'idle' };

/** One townsperson: who they are, what they want, and the body that walks it out. */
export class Agent {
  x = 0;
  y = 0;
  z = 0;
  h = 0;
  v = 0;
  state: State = 'think';
  /** What they are up to, in words. */
  say = '';
  goal = '';
  act: Act | null = null;
  beat = -1;
  rounds = 0;
  /** Seconds left in the current beat, reaction or pause. */
  t = 0;
  /** The building this person is inside, if any. */
  place: Place | null = null;
  inside = false;
  spot: Spot | null = null;
  seated = false;
  legs: Leg[] | null = null;
  li = 0;
  private dest: { p: P3; place: Place | null; indoor: boolean; spot: Spot | null } | null = null;
  kerb = 0;
  private okLeg = -1;
  /** A car is bearing down: run. */
  rush = false;
  stuck = 0;
  ghost = 0;
  hurry = false;
  /** Something carried from place to place (a bag of shopping, a briefcase), and what the current beat puts in hand. */
  carry = '';
  prop = '';
  talk: Talk | null = null;
  /** Seconds until this person will stop to greet or chat again. */
  cool = 0;
  private back: { state: State; clip: string } | null = null;
  private rt = 0;
  private pending: Beat | null = null;
  private sitT = 0;
  /** Places that could not be reached, with the hour to try again. */
  avoid = new Map<number, number>();
  fails = 0;
  lod = 2;
  private headYaw = 0;
  lookAt: { x: number; z: number } | null = null;
  lookT = 0;
  /** A push out of the way (m/s, for t seconds), taken during a reaction. */
  shove: { x: number; z: number; t: number } | null = null;

  constructor(
    readonly id: number,
    readonly name: string,
    readonly role: Role,
    readonly body: NpcBody,
    readonly needs: Needs,
    readonly traits: Traits,
    public home: Place | null,
    public work: Place | null,
    readonly friends: Set<number>,
  ) {}

  get indoors() {
    return this.inside;
  }
  get busy() {
    return this.state === 'react' || this.state === 'talk';
  }
  /** Standing about and free to be talked to. */
  get approachable() {
    return this.state === 'beat' && !this.seated && !this.inside && /^(hips|cross|look_around|idle|idle_shift|smoke|wait|watch|text)$/.test(this.body.clip);
  }

  /** Out on a carriageway right now. */
  get crossing() {
    return this.state === 'walk' && !!this.legs?.[this.li - 1]?.cross;
  }
  /** Stops what it is doing to stand in a conversation. */
  joinTalk(t: Talk) {
    if (this.state !== 'talk') this.back = { state: this.state === 'react' ? 'think' : this.state, clip: this.body.clip };
    this.talk = t;
    this.state = 'talk';
    this.v = 0;
  }
  leaveTalk() {
    this.talk = null;
    if (this.state !== 'talk') return;
    this.state = this.back?.state ?? 'think';
    if (this.state === 'beat') this.body.play(this.back!.clip, 0.3);
    if (this.state === 'think') this.t = 0.5;
  }

  place3(): P3 {
    return { x: this.x, y: this.y, z: this.z };
  }

  /** Gives up the spot being stood on. */
  release() {
    if (this.spot && this.spot.by === this.id) this.spot.by = -1;
    this.spot = null;
  }

  /** Starts an act at a place (the first beat walks there). */
  begin(goal: string, act: Act, place: Place | null, ctx: Ctx) {
    this.goal = goal;
    this.act = act;
    this.say = act.say;
    this.beat = -1;
    const r = act.rounds ?? [1, 1];
    this.rounds = r[0] + Math.floor(ctx.rand() * (r[1] - r[0] + 1));
    if (this.target) this.target.here--;
    if (place) place.here++;
    this.target = place;
    this.next(ctx);
  }
  /** The place the current act belongs to. */
  target: Place | null = null;

  /** Moves on to the next beat of the act: finds where it happens and sets off, or starts it on the spot. */
  next(ctx: Ctx): void {
    const act = this.act;
    if (!act) return this.idle(0.5);
    const prev = act.beats[this.beat];
    if (!prev?.keep) this.prop = '';
    this.beat++;
    if (this.beat >= act.beats.length) {
      if (--this.rounds <= 0) return this.idle(0.2 + ctx.rand());
      this.beat = 0;
    }
    const b = act.beats[this.beat];
    let go = b.go ?? 'stay';
    if (go === 'stay' || (go !== 'walk' && !this.target)) return this.start(b, ctx);
    this.pending = b;
    if (go === 'walk') {
      const far = this.goal === 'jog' ? 240 : this.goal === 'patrol' || this.goal === 'rounds' || this.goal === 'sights' ? 150 : 80;
      const n = ctx.nav.wander(this.x, this.z, far, ctx.rand);
      if (!n || this.inside !== false && !this.place?.out) return this.start(b, ctx);
      this.release();
      this.dest = { p: { x: n.x + (ctx.rand() - 0.5) * 0.8, y: n.y, z: n.z + (ctx.rand() - 0.5) * 0.8 }, place: null, indoor: false, spot: null };
      if (Number.isNaN(ctx.nav.grid.floor(this.dest.p.x, this.dest.p.z, n.y))) this.dest.p = n;
    } else {
      const p = this.target!;
      if (go === 'yard' && ctx.env.rain > 0.3 && !this.traits.umbrella && p.spots.length && !b.sit) go = 'in';
      let s = ctx.spot(this, p, go, !!b.sit);
      if (!s && !b.sit) s = ctx.spot(this, p, go === 'in' ? 'yard' : 'in', false);
      if (!s) return b.sit ? this.next(ctx) : this.start(b, ctx);
      this.dest = { p: s.seat && s.ax !== undefined ? { x: s.ax, y: s.y, z: s.az! } : s, place: p, indoor: s.indoor, spot: s };
    }
    this.state = 'route';
  }

  /** Stands a moment, then thinks again. */
  idle(t: number) {
    this.act = null;
    this.state = 'think';
    this.t = t;
    this.prop = '';
  }

  /** Works out the walk to the destination. False when there is no way; 'later' when planning must wait a frame. */
  private plan(ctx: Ctx): boolean | 'later' {
    const d = this.dest!;
    const g = ctx.nav.grid;
    const s = this.seated ? this.spot : null;
    const from = s && s.ax !== undefined ? { x: s.ax, y: s.y, z: s.az! } : this.place3();
    const legs: Leg[] = s ? [{ x: this.x, y: this.y, z: this.z }] : [];
    const add = (pts: P3[]) => {
      for (const p of pts) {
        const l = legs[legs.length - 1];
        if (!l || Math.hypot(l.x - p.x, l.z - p.z) > 0.05) legs.push({ x: p.x, y: p.y, z: p.z, cross: (p as RoutePt).cross });
      }
    };
    if (this.inside && d.indoor && d.place === this.place) {
      const p = g.plan(from, d.p, 7, 0.3);
      if (!p) return false;
      add(p);
    } else {
      let start = from;
      if (this.inside && this.place?.out) {
        const b = this.place;
        add(g.plan(from, b.inn!, 7, 0.45) ?? [from, b.inn!]);
        add([...b.door].reverse());
        legs[legs.length - 1].inside = false;
        start = b.out!;
      }
      const end = d.indoor ? d.place!.out : d.p;
      if (!end) return false;
      const mid = ctx.nav.route(start, end);
      if (mid === 'later') return 'later';
      if (!mid) return false;
      add(mid);
      if (d.indoor) {
        const way = d.spot?.path;
        if (!way) return false;
        add(d.place!.door);
        legs[legs.length - 1].inside = true;
        add(way);
      }
    }
    if (legs.length < 2) legs.push({ x: d.p.x, y: d.p.y, z: d.p.z });
    this.legs = legs;
    this.li = 1;
    this.kerb = this.stuck = 0;
    this.okLeg = -1;
    this.seated = false;
    this.release();
    return true;
  }

  /** The prop in hand right now: the beat's, else what is being carried, else an umbrella in the rain. */
  held(ctx: Ctx) {
    return this.prop || this.carry || (ctx.env.rain > 0.25 && this.traits.umbrella && !this.inside ? 'umbrella' : '');
  }

  /** Walking clip for the moment. */
  gait(ctx: Ctx) {
    if (this.hurry) return this.role.id === 'elder' ? 'walk' : ctx.env.rain > 0.6 || this.rush ? 'run' : 'jog';
    const held = this.held(ctx);
    if (held === 'box') return 'walk_carry';
    if (held === 'umbrella') return 'walk_umbrella';
    if (this.goal === 'jog') return 'jog';
    if (this.goal === 'play') return 'run';
    if (held === 'phone') return 'walk_phone';
    if (held) return 'walk_bag';
    if (this.role.id === 'elder') return 'walk_old';
    return /^(stroll|sights|park|beach|pier|bench)$/.test(this.goal) ? 'stroll' : 'walk';
  }

  /** True when no car is about to pass over the stretch from a to b. */
  private clear(ctx: Ctx, a: P3, b: P3) {
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const half = Math.hypot(b.x - a.x, b.z - a.z) / 2;
    for (const c of ctx.cars) {
      const dx = mx - c.x;
      const dz = mz - c.z;
      const ahead = dx * c.fx + dz * c.fz;
      const side = Math.abs(dx * c.fz - dz * c.fx);
      if (ahead > -c.hl - 1 && ahead < Math.max(7, c.v * 4.5) + c.hl && side < half + 2.6) {
        this.lookAt = c;
        return false;
      }
    }
    return true;
  }

  private walk(dt: number, ctx: Ctx) {
    const legs = this.legs!;
    const tgt = legs[this.li];
    const prev = legs[this.li - 1];
    const body = this.body;
    if (prev.cross && !legs[this.li - 2]?.cross && this.okLeg !== this.li && !this.inside) {
      if (this.kerb < 14 && !this.clear(ctx, prev, tgt)) {
        this.kerb += dt;
        this.v = 0;
        body.play(this.kerb > 1.5 ? 'wait' : 'idle', 0.3);
        return;
      }
      this.okLeg = this.li;
      this.kerb = 0;
    }
    if (!prev.cross) this.rush = false;
    const dx = tgt.x - this.x;
    const dz = tgt.z - this.z;
    const d = Math.hypot(dx, dz) || 1e-6;
    const ux = dx / d;
    const uz = dz / d;
    const clip = this.gait(ctx);
    const top = (body.meta(clip)?.speed ?? 1.3) * (body.height / 1.9);
    let sp = top;
    let steer = 0;
    let crowded = false;
    if (this.lod === 0 && this.ghost <= 0) {
      const see = (ox: number, oz: number, oy: number, ov: number, ofx: number, ofz: number) => {
        if (Math.abs(oy - this.y) > 1.2) return;
        const rx = ox - this.x;
        const rz = oz - this.z;
        const dist = Math.hypot(rx, rz);
        const ahead = rx * ux + rz * uz;
        if (dist > 1.15 || ahead < -0.1) return;
        const side = rx * uz - rz * ux;
        crowded = true;
        if (ov > 0.3 && ofx * ux + ofz * uz > 0.5) sp = Math.min(sp, Math.max(0, ov * 0.9 + (dist - 0.7) * 2));
        else {
          steer += Math.abs(side) < 0.12 ? -1 : side > 0 ? -1 : 1;
          if (dist < 0.55 && ahead > 0.2) sp *= 0.35;
        }
      };
      for (const o of ctx.around(this.x, this.z, 1.3)) if (o !== this) see(o.x, o.z, o.y, o.state === 'walk' ? o.v : 0, Math.sin(o.h), Math.cos(o.h));
      const p = ctx.player;
      if (p && !p.driving) see(p.x, p.z, p.y, 0, 0, 0);
    } else this.ghost -= dt;
    this.v += (sp - this.v) * Math.min(1, dt * 6);
    const step = this.v * dt;
    if (d <= (crowded && this.li < legs.length - 1 ? 0.7 : Math.max(step, 0.12))) {
      if (!crowded) {
        this.x = tgt.x;
        this.z = tgt.z;
      }
      this.y = tgt.y;
      if (tgt.inside !== undefined) {
        this.inside = tgt.inside;
        this.place = tgt.inside ? (this.dest?.place ?? null) : null;
      }
      if (++this.li >= legs.length) this.arrive(ctx);
      return;
    }
    let nx = this.x + ux * step;
    let nz = this.z + uz * step;
    if (steer) {
      const k = Math.sign(steer) * Math.min(0.9, this.v + 0.3) * dt;
      const g = ctx.nav.grid;
      if (!Number.isNaN(g.cell(Math.round((nx + uz * k * 6) / 0.4), Math.round((nz - ux * k * 6) / 0.4), this.y).f)) {
        nx += uz * k;
        nz -= ux * k;
      }
    }
    this.x = nx;
    this.z = nz;
    if (this.lod < 2) {
      const w = ctx.nav.grid.w;
      const f = Math.max(w.groundAt(nx, nz, this.y + 0.62), w.floorAt(nx, nz, this.y + 0.62)?.floor ?? -1e9);
      this.y += ((Math.abs(f - this.y) < 0.8 ? f : tgt.y) - this.y) * Math.min(1, dt * 14);
    } else this.y += (tgt.y - this.y) * Math.min(1, step / d);
    this.h = turn(this.h, Math.atan2(ux, uz), dt * 7);
    this.stuck = this.v < 0.15 ? this.stuck + dt : 0;
    if (this.stuck > 3.5) {
      this.ghost = 2.5;
      this.stuck = 0;
    }
    if (this.v < 0.12) body.play('idle', 0.3);
    else {
      body.play(clip, 0.3);
      body.rate = Math.max(0.45, Math.min(1.5, this.v / top));
    }
    body.hold(this.held(ctx) || null);
  }

  private arrive(ctx: Ctx) {
    this.legs = null;
    this.v = 0;
    this.hurry = this.rush = false;
    const d = this.dest;
    this.dest = null;
    if (d?.spot) {
      this.spot = d.spot;
      if (d.spot.seat) {
        this.seated = true;
        this.sitT = 0.5;
      }
    }
    const b = this.pending;
    this.pending = null;
    if (b) this.start(b, ctx);
    else this.idle(0.5);
  }

  /** Plays a beat where the agent stands. */
  private start(b: Beat, ctx: Ctx): void {
    if (b.sit && !this.seated) return this.next(ctx);
    let clip = typeof b.c === 'string' ? b.c : b.c[Math.floor(ctx.rand() * b.c.length)];
    if (this.seated && !clip.startsWith('sit')) clip = 'sit';
    if (clip === 'smoke' && !this.traits.smoker) clip = 'drink_stand';
    this.prop = b.p ?? '';
    if (clip === 'sit_read') this.prop = 'newspaper';
    else if (clip === 'sit_drink' || clip === 'drink_stand') this.prop = 'coffee_cup';
    else if (clip === 'smoke') this.prop = 'cigarette';
    else if (clip === 'phone') this.prop = 'phone';
    else if (clip === 'text') this.prop = 'phone_r';
    const held = this.held(ctx);
    if (clip === 'idle' && IDLE_PROP[held]) clip = IDLE_PROP[held];
    const body = this.body;
    body.play(clip, 0.3, true);
    body.hold(held || null);
    const m = body.meta(clip);
    const r = b.t ?? [5, 9];
    this.t = m && !m.loop ? m.dur : r[0] + ctx.rand() * (r[1] - r[0]);
    if (m?.loop) body.offset(ctx.rand() * m.dur);
    this.state = 'beat';
    this.v = 0;
    // leaving a shop with a bag, the bar with nothing
    if (this.goal === 'shop' && clip === 'counter') this.carry = 'shopping_bag';
    if (this.inside && this.place?.kind === 'home') this.carry = '';
  }

  /** Could not get there: let go of the spot, remember the place is out of reach for a while, and think again. */
  private fail(ctx: Ctx) {
    const d = this.dest;
    if (d?.spot && d.spot.by === this.id) d.spot.by = -1;
    if (d?.place) this.avoid.set(d.place.id, ctx.clock() + 3);
    this.dest = null;
    this.pending = null;
    this.fails++;
    this.idle(1 + ctx.rand() * 2);
  }

  /** Breaks off for a moment (a flinch, a wave) and then picks up where it left off. */
  react(clip: string, dur: number, look?: { x: number; z: number }) {
    if (this.state === 'react' || this.seated || this.state === 'talk') return false;
    this.back = { state: this.state, clip: this.body.clip };
    this.state = 'react';
    this.rt = dur;
    this.v = 0;
    this.body.play(clip, 0.12, true);
    if (look) this.lookAt = look;
    return true;
  }

  update(dt: number, ctx: Ctx) {
    this.cool -= dt;
    if (this.lookAt && this.state !== 'react' && (this.lookT -= dt) <= 0) this.lookAt = null;
    switch (this.state) {
      case 'react':
        if (this.lookAt) this.h = turn(this.h, Math.atan2(this.lookAt.x - this.x, this.lookAt.z - this.z), dt * 5);
        if (this.shove && this.shove.t > 0) {
          const nx = this.x + this.shove.x * dt;
          const nz = this.z + this.shove.z * dt;
          if (!Number.isNaN(ctx.nav.grid.cell(Math.round(nx / 0.4), Math.round(nz / 0.4), this.y).f)) {
            this.x = nx;
            this.z = nz;
          }
          this.shove.t -= dt;
        }
        if ((this.rt -= dt) <= 0) {
          this.state = this.back!.state;
          if (this.state === 'beat') this.body.play(this.back!.clip, 0.3);
          this.lookAt = null;
        }
        break;
      case 'think':
        if ((this.t -= dt) <= 0) ctx.think(this);
        else this.body.play(IDLE_PROP[this.held(ctx)] ?? 'idle', 0.4);
        break;
      case 'route': {
        const r = this.plan(ctx);
        if (r === true) this.state = 'walk';
        else if (r === false) this.fail(ctx);
        break;
      }
      case 'walk':
        this.walk(dt, ctx);
        break;
      case 'beat': {
        const s = this.spot;
        if (s && this.sitT > 0) {
          const k = Math.min(1, dt / this.sitT);
          this.x += (s.x - this.x) * k;
          this.z += (s.z - this.z) * k;
          this.sitT -= dt;
        }
        if (s?.ry !== undefined && (this.seated || this.beat === 0)) this.h = turn(this.h, s.ry, dt * 5);
        if ((this.t -= dt) <= 0) this.next(ctx);
        break;
      }
      case 'talk':
        break;
    }
  }

  /** Puts the body where the agent is and advances its animation. */
  pose(dt: number) {
    const g = this.body.group;
    g.position.set(this.x, this.y, this.z);
    g.rotation.y = this.h;
    this.body.update(dt);
    let want = 0;
    if (this.lookAt) {
      want = Math.atan2(this.lookAt.x - this.x, this.lookAt.z - this.z) - this.h;
      want = ((((want + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
      if (Math.abs(want) > 1.4) want = 0;
    }
    this.headYaw += (want - this.headYaw) * Math.min(1, dt * 5);
    if (Math.abs(this.headYaw) > 0.02) this.body.look(this.headYaw);
  }
}

/** A conversation: who is in it, who is speaking, and how long it has left. */
export interface Talk {
  members: Agent[];
  t: number;
  speaker: number;
  swap: number;
  x: number;
  z: number;
}

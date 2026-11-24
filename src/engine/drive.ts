import * as THREE from 'three';
import { Batcher, Kit } from '../world/core/kit';
import { vehicleBody, drawWheel, type VehicleType, type VehicleOpts, type WheelInfo } from '../world/vehicles';
import type { TownWorld } from '../world';
import { EngineAudio } from './audio';
import { Spray } from './spray';
import { surfaceUniforms } from '../world/materials';

interface DriveSpec {
  top: number; // m/s
  accel: number;
  brake: number;
  grip: number; // lateral slip damping (1/s)
  offroad: number; // 0..1 how well it copes off tarmac
  steer: number; // max wheel angle (rad)
  gears: number;
}

const SPECS: Partial<Record<VehicleType, DriveSpec>> = {
  sedan: { top: 44, accel: 7, brake: 14, grip: 9, offroad: 0.55, steer: 0.6, gears: 4 },
  coupe: { top: 52, accel: 9.5, brake: 15, grip: 9.6, offroad: 0.45, steer: 0.58, gears: 5 },
  pickup: { top: 42, accel: 7, brake: 13, grip: 8, offroad: 0.78, steer: 0.55, gears: 4 },
  jeep: { top: 36, accel: 7.5, brake: 13, grip: 9, offroad: 0.97, steer: 0.66, gears: 4 },
  suv: { top: 42, accel: 6.8, brake: 13, grip: 8, offroad: 0.82, steer: 0.55, gears: 4 },
  van: { top: 38, accel: 6, brake: 12, grip: 7.5, offroad: 0.6, steer: 0.55, gears: 4 },
  wagon: { top: 42, accel: 6.5, brake: 13, grip: 8.5, offroad: 0.55, steer: 0.58, gears: 4 },
  sheriff: { top: 50, accel: 8.5, brake: 15, grip: 9, offroad: 0.65, steer: 0.6, gears: 5 },
  sheriffSuv: { top: 46, accel: 8, brake: 14, grip: 8.5, offroad: 0.85, steer: 0.56, gears: 4 },
  police: { top: 50, accel: 8.5, brake: 15, grip: 9, offroad: 0.62, steer: 0.6, gears: 5 },
  delivery: { top: 32, accel: 5, brake: 11, grip: 7, offroad: 0.55, steer: 0.5, gears: 4 },
  firetruck: { top: 32, accel: 4.6, brake: 10, grip: 7, offroad: 0.6, steer: 0.45, gears: 5 },
  tractor: { top: 12, accel: 4, brake: 9, grip: 10, offroad: 1, steer: 0.7, gears: 3 },
  semi: { top: 34, accel: 4.4, brake: 9, grip: 7, offroad: 0.6, steer: 0.45, gears: 8 },
  tow: { top: 40, accel: 6.5, brake: 13, grip: 8, offroad: 0.72, steer: 0.55, gears: 4 },
};

export interface Drivable {
  id: VehicleType;
  name: string;
  color: number;
  opts?: VehicleOpts;
}

export const DRIVABLE: Drivable[] = [
  { id: 'pickup', name: 'Pickup truck', color: 0xa62e2a, opts: { accent: 0xf2f1ec } },
  { id: 'coupe', name: 'Muscle coupe', color: 0xd27d2c, opts: { stripes: true } },
  { id: 'sedan', name: 'Sedan', color: 0xc6b28c },
  { id: 'jeep', name: 'Jeep (off-road)', color: 0xd9902a },
  { id: 'sheriff', name: 'Sheriff cruiser', color: 0 },
  { id: 'police', name: 'Police cruiser', color: 0 },
  { id: 'sheriffSuv', name: 'Sheriff SUV', color: 0 },
  { id: 'suv', name: 'SUV', color: 0x2f4a3d },
  { id: 'van', name: 'Van', color: 0xe4dbc3 },
  { id: 'wagon', name: 'Woody wagon', color: 0x5e3d2a, opts: { woody: true } },
  { id: 'tow', name: 'Tow truck', color: 0x2c3858, opts: { accent: 0xe9e8e2 } },
  { id: 'delivery', name: 'FDS delivery van', color: 0x4a3426 },
  { id: 'firetruck', name: 'Fire engine', color: 0xb5241e },
  { id: 'tractor', name: 'Tractor', color: 0x2f7a3a },
  { id: 'semi', name: 'Semi tractor', color: 0x1d1d1f, opts: { accent: 0xd9d9d6 } },
];

interface WheelRig {
  /** World position of the contact patch and the ground height there (updated every frame). */
  wx: number;
  wz: number;
  g: number;
  travel: number;
  pivot: THREE.Group;
  spin: THREE.Group;
  info: WheelInfo;
  front: boolean;
}

const G = 9.81;
/** Part-time four-wheel drive; everything else drives the rear axle. */
const AWD = new Set<VehicleType>(['jeep', 'suv', 'sheriffSuv', 'pickup', 'tow', 'tractor']);
const _v = new THREE.Vector3();

/** Arcade vehicle controller: terrain-following suspension, slip/drift, collisions, chase cameras. */
export class DriveMode {
  active = false;
  camMode = 0;
  readonly car = new THREE.Group();
  readonly pos = new THREE.Vector3();
  heading = 0;
  speed = 0;
  onRoad = true;
  type: VehicleType = 'pickup';
  readonly audio = new EngineAudio();

  private body = new THREE.Group();
  private wheels: WheelRig[] = [];
  private spec: DriveSpec = SPECS.pickup!;
  private len = 5.5;
  private width = 2;
  private height = 1.8;
  private wheelbase = 3.3;
  private track = 1.7;
  private frontX = 1.7;
  private cx = 0;
  private vel = new THREE.Vector2();
  private steer = 0;
  private yawRate = 0;
  private y = 0;
  private vy = 0;
  private lastGround = 0;
  private pitch = 0;
  private roll = 0;
  private lean = 0;
  private dip = 0;
  private lastSpeed = 0;
  private keys = new Set<string>();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camYaw = 0;
  private camPitch = 0.12;
  private camZoom = 1;
  private dragAt = -10;
  private dragging = false;
  private shake = 0;
  private snapCam = true;
  private obstacles: { x: number; z: number; c: number; s: number; hl: number }[] = [];
  private time = 0;
  private slip = 0;
  /** Last step's tyre state (handling tests). */
  tele: Record<string, number> = {};
  /** Ignore collisions (scripted handling tests). */
  ghost = false;
  /** Current gear: -1 reverse, 1..n forward. */
  gear = 1;
  /** Engine speed, 0..1 of the redline. */
  rpm = 0.13;
  private load = 0;
  private shiftT = 0;
  private ax = 0;
  private spin = 0;
  private airborne = false;
  /** 0..1: how deep the car is wading. */
  wade = 0;
  /** Floating: the wheels no longer reach the bed. */
  afloat = false;
  private waterY = -1e9;
  private current = new THREE.Vector2();
  private surface: 'paved' | 'dirt' | 'grass' = 'paved';
  private fxAcc = 0;
  readonly spray = new Spray();
  readonly headlight = new THREE.SpotLight(0xfff0d2, 0, 85, 0.48, 0.7, 1.5);

  constructor(
    private world: TownWorld,
    scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.car.name = 'player-car';
    this.car.visible = false;
    this.car.add(this.body);
    this.car.rotation.order = 'YZX';
    // one spot stands in for both headlamps; it is always in the scene (dark by day) so shaders compile once
    this.headlight.position.set(1.8, 0.75, 0);
    this.headlight.target.position.set(24, -0.2, 0);
    this.car.add(this.headlight, this.headlight.target);
    scene.add(this.car, this.spray.points);
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('pointerdown', () => {
      if (this.active) this.dragging = true;
    });
    window.addEventListener('pointerup', () => {
      this.dragging = false;
      this.dragAt = this.time;
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.active || !this.dragging) return;
      this.camYaw -= e.movementX * 0.006;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + e.movementY * 0.004, -0.1, 0.9);
      this.dragAt = this.time;
    });
    dom.addEventListener(
      'wheel',
      (e) => {
        if (!this.active) return;
        this.camZoom = THREE.MathUtils.clamp(this.camZoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.55, 2.6);
      },
      { passive: true },
    );
  }

  /** Simulated key state (used by scripted captures). */
  setKeys(codes: string[]) {
    this.keys = new Set(codes);
  }

  setVehicle(d: Drivable, color = d.color) {
    for (const o of [...this.body.children]) this.body.remove(o);
    for (const w of this.wheels) this.car.remove(w.pivot);
    this.car.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    this.wheels = [];
    this.type = d.id;
    this.spec = SPECS[d.id] ?? SPECS.sedan!;
    const mats = this.world.materials;
    const b = new Batcher(1, false);
    const infos = vehicleBody(new Kit(b, mats), this.world.signs, d.id, color, d.opts ?? {});
    b.build((key) => mats.get(key), this.body);
    for (const m of this.body.children) (m as THREE.Mesh).castShadow = true;
    const xs = infos.map((w) => w.x);
    const maxX = Math.max(...xs);
    const minX = Math.min(...xs);
    for (const info of infos) {
      const wb = new Batcher(1, false);
      drawWheel(new Kit(wb, mats), info.r, info.width, info.side, info.dual, info.model);
      const spin = new THREE.Group();
      wb.build((key) => mats.get(key), spin);
      spin.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      const pivot = new THREE.Group();
      pivot.position.set(info.x, info.r, info.z);
      pivot.add(spin);
      this.car.add(pivot);
      this.wheels.push({ wx: 0, wz: 0, g: 0, travel: 0, pivot, spin, info, front: info.x > (maxX + minX) / 2 + 0.1 });
    }
    const box = new THREE.Box3().setFromObject(this.body);
    this.len = box.max.x - box.min.x;
    this.width = Math.min(2.6, box.max.z - box.min.z);
    this.height = box.max.y;
    this.wheelbase = Math.max(1.6, maxX - minX);
    this.frontX = box.max.x;
    this.headlight.position.set(box.max.x - 0.15, Math.min(1.0, this.height * 0.45), 0);
    this.headlight.target.position.set(box.max.x + 24, -0.2, 0);
    this.cx = (box.max.x + box.min.x) / 2;
    this.track = Math.max(1.2, Math.max(...infos.map((w) => Math.abs(w.z))) * 2);
  }

  enter(d: Drivable, color?: number, at?: { x: number; z: number; heading: number }) {
    this.setVehicle(d, color);
    const p = at ?? this.world.nearestRoad(this.camera.position.x, this.camera.position.z, this.cameraHeading());
    this.place(p.x, p.z, p.heading);
    this.active = true;
    this.car.visible = true;
    this.snapCam = true;
    this.audio.start();
  }

  exit() {
    this.active = false;
    this.car.visible = false;
    this.spray.points.visible = false;
    this.keys.clear();
    this.audio.stop();
  }

  /** Step out: the car stays where it stopped, engine off. */
  park() {
    this.active = false;
    this.keys.clear();
    this.vel.set(0, 0);
    this.speed = 0;
    this.audio.stop();
  }

  /** Get back in the parked car. */
  resume() {
    this.active = true;
    this.snapCam = true;
    this.audio.start();
  }

  /** Is a world point inside the car's footprint (plus `pad`)? */
  contains(x: number, z: number, pad = 0) {
    const dx = x - this.pos.x;
    const dz = z - this.pos.z;
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    return Math.abs(dx * c - dz * s - this.cx) < this.len / 2 + pad && Math.abs(dx * s + dz * c) < this.width / 2 + pad;
  }

  /** Where the driver stands after getting out. */
  doorSpot() {
    const k = this.width / 2 + 0.75;
    return { x: this.pos.x - Math.sin(this.heading) * k, z: this.pos.z - Math.cos(this.heading) * k };
  }

  place(x: number, z: number, heading: number) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.vel.set(0, 0);
    this.speed = 0;
    this.yawRate = 0;
    this.gear = 1;
    this.rpm = 0.13;
    this.ax = this.spin = this.shiftT = 0;
    this.steer = 0;
    this.y = this.lastGround = this.world.groundAt(x, z);
    this.vy = 0;
    this.pitch = this.roll = this.lean = this.dip = 0;
    this.pose(1 / 60);
    this.snapCam = true;
  }

  reset() {
    const p = this.world.nearestRoad(this.pos.x, this.pos.z, this.heading);
    this.place(p.x, p.z, p.heading);
  }

  private cameraHeading() {
    this.camera.getWorldDirection(_v);
    return Math.atan2(-_v.z, _v.x);
  }

  private blocked(x: number, z: number, h: number): boolean {
    if (this.ghost) return false;
    const c = Math.cos(h);
    const s = Math.sin(h);
    const hl = this.len / 2 - 0.15;
    const hw = this.width / 2 - 0.12;
    const cx = this.cx;
    const pts = [
      [cx + hl, -hw],
      [cx + hl, hw],
      [cx - hl, -hw],
      [cx - hl, hw],
      [cx + hl, 0],
      [cx - hl, 0],
      [cx, -hw],
      [cx, hw],
    ];
    for (const [lx, lz] of pts) {
      const wx = x + lx * c + lz * s;
      const wz = z - lx * s + lz * c;
      if (this.world.solidAt(wx, wz, this.y + 0.6)) return true;
      for (const o of this.obstacles) {
        const dx = wx - o.x;
        const dz = wz - o.z;
        if (Math.abs(dx * o.c - dz * o.s) < o.hl && Math.abs(dx * o.s + dz * o.c) < 1.05) return true;
      }
    }
    return false;
  }

  /** Speed at the redline in a gear (1-based); the ratios close up towards top gear like a real box. */
  private gearTop(g: number) {
    return this.spec.top * 1.04 * Math.pow(g / this.spec.gears, 0.82);
  }

  /**
   * One physics step. Longitudinal: engine torque curve through an automatic gearbox, brakes, drag and
   * rolling resistance. Lateral: a two-axle (bicycle) model with slip angles, a Pacejka-style tyre curve,
   * a friction circle shared between traction and cornering, and weight transfer under power and braking.
   */
  private step(h: number) {
    const k = this.keys;
    const up = k.has('KeyW') || k.has('ArrowUp');
    const down = k.has('KeyS') || k.has('ArrowDown');
    const st = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0);
    const hb = k.has('Space');
    const boost = k.has('ShiftLeft') || k.has('ShiftRight');
    const sp = this.spec;
    const road = this.world.roadAt(this.pos.x, this.pos.z, this.y);
    const paved = !!road && road.kind !== 'dirt';
    this.onRoad = paved;
    this.surface = paved ? 'paved' : road ? 'dirt' : 'grass';
    const wet = surfaceUniforms.uWet.value;
    const surfTop = road ? (paved ? 1 : 0.8) : 0.45 + 0.5 * sp.offroad;
    // tyre grip: tarmac, gravel, grass; rain takes a fifth off tarmac; nothing while airborne
    let mu = (road ? (paved ? 1 : 0.74) : 0.5 + 0.38 * sp.offroad) * (1 - (paved ? 0.22 : 0.1) * wet) * (sp.grip / 8.5);
    if (this.airborne) mu = 0.02;
    mu *= this.afloat ? 0.03 : 1 - 0.6 * this.wade;
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    let vx = this.vel.x * c - this.vel.y * s;
    let vy = -(this.vel.x * s + this.vel.y * c); // left-positive
    let r = this.yawRate;

    // --- driver → gearbox
    let throttle = 0;
    let brake = 0;
    if (up && !down) {
      if (vx < -0.6) brake = 1;
      else {
        if (this.gear < 1) this.gear = 1;
        throttle = 1;
      }
    } else if (down) {
      if (vx > 0.6) brake = 1;
      else {
        this.gear = -1;
        throttle = 1;
      }
    }
    const av = Math.abs(vx);
    if (this.shiftT > 0) this.shiftT -= h;
    else if (this.gear >= 1) {
      if (this.gear < sp.gears && av / this.gearTop(this.gear) > (throttle ? 0.93 : 0.6)) {
        this.gear++;
        this.shiftT = 0.24;
      } else if (this.gear > 1 && av / this.gearTop(this.gear - 1) < (throttle ? 0.62 : 0.4)) {
        this.gear--;
        this.shiftT = 0.16;
      }
    }
    const first = this.gearTop(1);
    const gTop = this.gear < 0 ? first * 0.8 : this.gearTop(Math.max(1, this.gear));
    const ratio = first / gTop;
    const re = av / gTop;
    const torque = re > 1.03 ? 0 : 0.62 + 1.5 * re - 1.32 * re * re;
    const peak = sp.accel * 1.25;
    let drive = this.shiftT > 0 ? 0 : throttle * peak * torque * ratio * (boost ? 1.35 : 1) * (this.gear < 0 ? -0.75 : 1);
    drive *= this.afloat ? 0.25 : 1 - 0.75 * this.wade; // afloat, the wheels only paddle
    // the tach: clutch slip off the line, a dip on each shift
    const rpmT = this.shiftT > 0 ? re * 0.75 : Math.max(re, throttle ? 0.34 : 0.13);
    this.rpm += (Math.min(1.02, rpmT) - this.rpm) * Math.min(1, h * 9);
    this.load = throttle;

    // --- axle loads and the friction circle
    const L = this.wheelbase;
    const a = L * 0.47;
    const b = L - a;
    const wf = THREE.MathUtils.clamp(b / L - ((this.height * 0.3) / L) * (this.ax / G), 0.25, 0.75);
    const wr = 1 - wf;
    const Df = mu * G * wf;
    const Dr = mu * G * wr;
    const awd = AWD.has(this.type);
    let fxf = awd ? drive * 0.45 : 0;
    let fxr = awd ? drive * 0.55 : drive;
    const bf = brake * sp.brake * 0.62;
    const br = hb ? Dr : brake * sp.brake * 0.38;
    const useF = (Math.abs(fxf) + bf) / Math.max(Df, 0.01);
    const useR = (Math.abs(fxr) + br) / Math.max(Dr, 0.01);
    this.spin = fxr !== 0 && !this.airborne ? Math.max(0, Math.abs(fxr) - Dr) * Math.sign(fxr) : 0;
    fxf = THREE.MathUtils.clamp(fxf, -Df, Df);
    fxr = THREE.MathUtils.clamp(fxr, -Dr, Dr);
    const share = (u: number) => (u <= 0.8 ? 1 : Math.max(0.55, 1 - (u - 0.8) * 0.9));
    // cornering grip sits a little above traction grip (it is a game), and the rear axle gets the extra
    // bite that makes a road car push its nose wide before it lets go at the back
    const latF = Df * share(useF) * 1.2;
    const latR = Dr * (hb ? 0.3 : share(useR)) * 1.38;

    // --- tyres
    const maxSteer = sp.steer / (1 + (av / 13) ** 2 * 0.9);
    this.steer += (st * maxSteer - this.steer) * Math.min(1, h * (st ? 5.5 : 8));
    const dl = this.steer;
    const vxa = Math.max(av, 2);
    const dir = vx < 0 ? -1 : 1;
    const af = Math.atan2(vy + a * r, vxa) - dl * dir;
    const ar = Math.atan2(vy - b * r, vxa);
    const fyf = -latF * Math.sin(1.45 * Math.atan(7.5 * af));
    const fyr = -latR * Math.sin(1.45 * Math.atan(7.5 * ar));
    const cd = Math.cos(dl);
    const sd = Math.sin(dl);
    // velocity is kept in world space and re-projected every step, so no rotating-frame terms here
    const ax = fxr + fxf * cd - fyf * sd - G * Math.sin(this.pitch) * 0.9;
    const ay = fyr + fyf * cd + fxf * sd;
    const rd = (a * (fyf * cd + fxf * sd) - b * fyr) / (a * b * 1.15);
    this.ax += (fxr + fxf - dir * Math.min(bf, Df) - dir * Math.min(br, Dr) * (av > 0.5 ? 1 : 0) - this.ax) * Math.min(1, h * 10);

    // --- integrate; things that only ever oppose motion are applied so they cannot reverse it
    const prev = vx;
    vx += ax * h;
    const drag = Math.max(0.0004, (peak * 0.8 * (first / this.gearTop(sp.gears)) - 0.3) / (sp.top * sp.top)) / (surfTop * surfTop) / (boost ? 1.4 : 1);
    const rolling = paved ? 0.3 : road ? 0.7 : 1.1 + 2.2 * (1 - sp.offroad);
    const engineBrake = throttle || this.shiftT > 0 ? 0 : (0.3 + 1.5 * re) * Math.min(1.6, ratio);
    const water = this.afloat ? 0.3 + 0.35 * vx * vx : this.wade * (1.5 + 0.25 * vx * vx);
    const res = (rolling + drag * vx * vx + engineBrake + Math.min(bf, Df) + Math.min(br, Dr) + water) * (this.airborne ? 0.05 : 1) * h;
    if (Math.abs(vx) <= res && (!throttle || brake || hb)) vx = 0;
    else vx -= Math.sign(vx) * res;
    if (!throttle && prev !== 0 && Math.sign(vx) !== Math.sign(prev)) vx = 0;
    // below walking pace the slip-angle model is ill-conditioned: blend into plain kinematic steering
    const w = THREE.MathUtils.smoothstep(Math.abs(vx), 1.5, 5.5);
    if (this.afloat) {
      // a hull, not a car: the water damps everything and the front wheels make a poor rudder
      r = r * Math.exp(-1.5 * h) + dl * vx * 0.5 * h;
      vy *= Math.exp(-1.4 * h);
    } else {
      r = THREE.MathUtils.lerp((vx / L) * Math.tan(dl) * (hb ? 1.3 : 1), r + rd * h, w);
      vy = THREE.MathUtils.lerp(vy * Math.exp(-10 * h), vy + ay * h, w);
    }
    if (this.airborne) r *= Math.exp(-0.4 * h);
    this.yawRate = r;
    this.slip = this.airborne ? 0 : Math.max(0, Math.abs(ar) - 0.09) * vxa * 1.6 + Math.max(0, Math.abs(af) - 0.14) * vxa + Math.abs(this.spin) * 0.35 + (hb && av > 2 ? av * 0.25 : 0);
    this.tele = { af, ar, fyf, fyr, mu, wf, air: this.airborne ? 1 : 0, steer: dl, vy, r, w };
    this.vel.set(vx * c - vy * s, -vx * s - vy * c);
    const yaw = r;
    const nh = this.heading + yaw * h;
    // afloat, `vel` is relative to the water, which is itself going somewhere
    const nx = this.pos.x + (this.vel.x + (this.afloat ? this.current.x : 0)) * h;
    const nz = this.pos.z + (this.vel.y + (this.afloat ? this.current.y : 0)) * h;
    // already overlapping something (spawned into it): let the car drive out
    if (this.blocked(this.pos.x, this.pos.z, this.heading) || !this.blocked(nx, nz, nh)) {
      this.pos.x = nx;
      this.pos.z = nz;
      this.heading = nh;
    } else {
      const before = this.vel.length();
      if (!this.blocked(nx, this.pos.z, nh)) {
        this.pos.x = nx;
        this.vel.y *= -0.15;
        this.heading = nh;
      } else if (!this.blocked(this.pos.x, nz, nh)) {
        this.pos.z = nz;
        this.vel.x *= -0.15;
        this.heading = nh;
      } else {
        if (!this.blocked(this.pos.x, this.pos.z, nh)) this.heading = nh;
        this.vel.multiplyScalar(-0.22);
      }
      this.yawRate *= 0.4;
      const hit = before - this.vel.length();
      if (hit > 2.5) {
        this.shake = Math.min(1, hit / 15);
        this.audio.impact(hit);
      }
    }
    this.speed = this.vel.x * Math.cos(this.heading) - this.vel.y * Math.sin(this.heading);
  }

  /** A car hitting the water at speed: a wall of spray, a jolt, and the brakes it never asked for. */
  private splash(waterY: number, speed: number) {
    const n = Math.min(140, 30 + speed * 5);
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const out = 1 + Math.random() * (2 + speed * 0.22);
      const fx = this.pos.x + c * this.len * 0.3 + Math.cos(a) * this.width * 0.5;
      const fz = this.pos.z - s * this.len * 0.3 + Math.sin(a) * this.width * 0.5;
      this.spray.emit(fx, waterY + 0.1, fz, Math.cos(a) * out + this.vel.x * 0.35, 2.5 + Math.random() * (2 + speed * 0.3), Math.sin(a) * out + this.vel.y * 0.35, 0.7 + Math.random() * 0.7, 0.3 + Math.random() * 0.45, 0xe6eef0, 0.55, 2.2);
    }
    this.shake = Math.max(this.shake, Math.min(0.8, speed / 28));
    this.audio.impact(speed * 0.5);
    this.vel.multiplyScalar(0.72);
  }

  /** Spray in water, rooster tails on wet tarmac, dust off gravel and grass, smoke from sliding tyres. */
  private effects(dt: number) {
    const v = Math.abs(this.speed);
    const wet = surfaceUniforms.uWet.value;
    let rate = 0;
    let kind = 0;
    if (this.wade > 0.03) {
      rate = Math.min(110, (v + Math.abs(this.spin)) * 10) * (0.35 + this.wade);
      kind = 1;
    } else if (!this.airborne && this.surface !== 'paved' && v > 3.5) {
      rate = Math.min(42, v * 1.7) * (1 - 0.8 * wet);
      kind = 2;
    } else if (!this.airborne && this.slip > 2.2) {
      rate = Math.min(60, this.slip * 9);
      kind = wet > 0.5 ? 4 : 3;
    } else if (!this.airborne && wet > 0.35 && v > 8) {
      rate = Math.min(50, v * 1.4) * wet;
      kind = 4;
    }
    if (!kind) {
      this.fxAcc = 0;
      return;
    }
    this.fxAcc += rate * dt;
    const R = Math.random;
    while (this.fxAcc >= 1) {
      this.fxAcc -= 1;
      const rear = this.wheels.filter((w) => !w.front);
      const pool = kind === 1 || !rear.length ? this.wheels : rear;
      const w = pool[Math.floor(R() * pool.length)];
      if (!w) return;
      const side = Math.sign(w.info.z) || 1;
      // sideways unit vector (towards this wheel's side of the car) in world space
      const ox = Math.sin(this.heading) * side;
      const oz = Math.cos(this.heading) * side;
      const jx = (R() - 0.5) * 0.3;
      const jz = (R() - 0.5) * 0.3;
      if (kind === 1) {
        const out = 0.6 + R() * (1.2 + v * 0.16);
        this.spray.emit(w.wx + jx, this.waterY + 0.05, w.wz + jz, ox * out + this.vel.x * 0.45, 1.2 + R() * (1.2 + v * 0.16), oz * out + this.vel.y * 0.45, 0.45 + R() * 0.5, 0.2 + R() * 0.3, 0xe2ebee, 0.5, 2.4);
      } else if (kind === 2) {
        const dirt = this.surface === 'dirt' ? 0x9c8c70 : 0x8a8466;
        this.spray.emit(w.wx + jx, w.g + 0.15, w.wz + jz, this.vel.x * 0.12 + ox * R() * 0.6, 0.5 + R() * 0.7, this.vel.y * 0.12 + oz * R() * 0.6, 1.1 + R() * 0.9, 0.45 + R() * 0.35, dirt, 0.2, 3.6, -0.25);
      } else if (kind === 3) {
        this.spray.emit(w.wx + jx, w.g + 0.12, w.wz + jz, this.vel.x * 0.1 + ox * R() * 0.5, 0.4 + R() * 0.5, this.vel.y * 0.1 + oz * R() * 0.5, 1.0 + R() * 0.8, 0.4 + R() * 0.3, 0xdcdcdc, 0.2, 4.2, -0.5);
      } else {
        this.spray.emit(w.wx + jx, w.g + 0.1, w.wz + jz, this.vel.x * 0.3 + ox * R() * 0.8, 0.8 + R() * (0.8 + v * 0.05), this.vel.y * 0.3 + oz * R() * 0.8, 0.5 + R() * 0.4, 0.35 + R() * 0.3, 0xcdd5d9, 0.13, 3.2, 3);
      }
    }
  }

  private pose(dt: number) {
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    let hf = 0;
    let hr = 0;
    let nf = 0;
    let nr = 0;
    let hl = 0;
    let hrt = 0;
    let nl = 0;
    let nrt = 0;
    for (const w of this.wheels) {
      const gx = this.pos.x + w.info.x * c + w.info.z * s;
      const gz = this.pos.z - w.info.x * s + w.info.z * c;
      const g = this.world.groundAt(gx, gz, this.y + 0.3);
      w.wx = gx;
      w.wz = gz;
      w.g = g;
      if (w.front) {
        hf += g;
        nf++;
      } else {
        hr += g;
        nr++;
      }
      if (w.info.z < 0) {
        hl += g;
        nl++;
      } else {
        hrt += g;
        nrt++;
      }
    }
    hf /= Math.max(1, nf);
    hr /= Math.max(1, nr);
    hl /= Math.max(1, nl);
    hrt /= Math.max(1, nrt);
    const bed = (hf + hr) / 2;
    let ground = bed;
    let pitchT = Math.atan2(hf - hr, this.wheelbase);
    let rollT = Math.atan2(hl - hrt, this.track);
    // water: wade while the wheels reach the bed, float (and drift with the current) once they do not
    const wa = this.world.waterAt(this.pos.x, this.pos.z);
    const draft = Math.min(0.62, this.height * 0.34);
    const wasAfloat = this.afloat;
    this.afloat = !!wa && wa.y - draft > bed + (wasAfloat ? 0 : 0.05);
    if (wa && this.afloat) {
      ground = wa.y - draft + Math.sin(this.time * 1.9) * 0.025;
      pitchT = Math.sin(this.time * 1.3) * 0.02 - this.ax * 0.004;
      rollT = Math.sin(this.time * 1.05 + 1) * 0.03;
      this.current.set(wa.fx, wa.fz);
    }
    const wade = wa ? THREE.MathUtils.clamp((wa.y - this.y) / 0.8, 0, 1) : 0;
    if (wa && wade > 0.12 && this.wade <= 0.12 && Math.abs(this.speed) > 5) this.splash(wa.y, Math.abs(this.speed));
    this.wade = wade;
    this.waterY = wa ? wa.y : -1e9;
    // suspension: follow the ground, but launch off crests faster than gravity can pull us down
    const groundVel = (ground - this.lastGround) / Math.max(dt, 1e-3);
    this.lastGround = ground;
    const airborne = this.y > ground + 0.04;
    this.airborne = this.y > ground + 0.12;
    if (this.afloat) {
      this.airborne = false;
      this.y += (ground - this.y) * Math.min(1, dt * (this.y > ground ? 6 : 3));
      this.vy = 0;
    } else if (airborne) {
      this.vy -= G * dt;
      this.y += this.vy * dt;
      if (this.y <= ground) {
        if (this.vy < -4) this.shake = Math.min(1, -this.vy / 14);
        this.y = ground;
        this.vy = 0;
      }
    } else {
      const ny = this.y + this.vy * dt - 0.5 * G * dt * dt;
      if (ny > ground + 0.04 && this.vy > 2) {
        this.y = ny;
        this.vy -= G * dt;
      } else {
        this.y = ground;
        this.vy = groundVel;
      }
    }
    const k = Math.min(1, dt * (airborne ? 2 : 12));
    this.pitch += (pitchT - this.pitch) * k;
    this.roll += (rollT - this.roll) * k;
    const acc = (this.speed - this.lastSpeed) / Math.max(dt, 1e-3);
    this.lastSpeed = this.speed;
    this.lean += (THREE.MathUtils.clamp(this.speed * this.yawRate * 0.012, -0.075, 0.075) - this.lean) * Math.min(1, dt * 6);
    this.dip += (THREE.MathUtils.clamp(acc * 0.005, -0.045, 0.045) - this.dip) * Math.min(1, dt * 6);
    this.car.position.set(this.pos.x, this.y, this.pos.z);
    this.car.rotation.set(this.roll, this.heading, this.pitch, 'YZX');
    this.body.rotation.set(this.lean, 0, this.dip);
    for (const w of this.wheels) {
      // driven wheels show wheelspin; the handbrake locks the rears
      const locked = !w.front && this.keys.has('Space');
      const extra = w.front && !AWD.has(this.type) ? 0 : this.spin * 2.5;
      if (!locked) w.spin.rotation.z -= ((this.speed + extra) * dt) / w.info.r;
      if (w.front) w.pivot.rotation.y = this.steer;
      // each wheel follows its own patch of ground; the body rides on the average
      const rest = this.y + w.info.x * Math.sin(this.pitch) - w.info.z * Math.sin(this.roll);
      const t = this.airborne || this.afloat ? -0.08 : THREE.MathUtils.clamp(w.g - rest, -0.1, 0.1);
      w.travel += (t - w.travel) * Math.min(1, dt * 16);
      w.pivot.position.y = w.info.r + w.travel;
    }
    this.effects(dt);
  }

  private updateCamera(dt: number) {
    const cam = this.camera;
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    if (this.camMode === 2) {
      this.car.updateMatrixWorld();
      const eye = new THREE.Vector3(this.frontX - this.len * 0.45, this.height * 0.84, 0).applyMatrix4(this.car.matrixWorld);
      const look = new THREE.Vector3(this.frontX + 30, this.height * 0.7, 0).applyMatrix4(this.car.matrixWorld);
      cam.position.copy(eye);
      cam.lookAt(look);
      this.camPos.copy(eye);
    } else {
      if (!this.dragging && this.time - this.dragAt > 1.4) {
        this.camYaw *= Math.exp(-dt * 3);
        this.camPitch += (0.12 - this.camPitch) * Math.min(1, dt * 2);
      }
      const size = THREE.MathUtils.clamp(this.len / 5.2, 0.85, 2.4);
      const dist = (this.camMode === 0 ? 7.2 : 12.5) * size * this.camZoom;
      const yaw = this.heading + Math.PI + this.camYaw;
      const want = new THREE.Vector3(
        this.pos.x + Math.cos(yaw) * Math.cos(this.camPitch) * dist,
        this.y + 1.2 * size + Math.sin(this.camPitch) * dist + (this.camMode === 0 ? 1.0 : 2.4),
        this.pos.z - Math.sin(yaw) * Math.cos(this.camPitch) * dist,
      );
      const look = new THREE.Vector3(this.pos.x + c * 2.8, this.y + 1.1 * size, this.pos.z - s * 2.8);
      const k = this.snapCam ? 1 : 1 - Math.exp(-dt * 7);
      this.camPos.lerp(want, k);
      this.camLook.lerp(look, this.snapCam ? 1 : 1 - Math.exp(-dt * 12));
      const floor = this.world.groundAt(this.camPos.x, this.camPos.z) + 0.6;
      if (this.camPos.y < floor) this.camPos.y = floor;
      cam.position.copy(this.camPos);
      cam.lookAt(this.camLook);
    }
    if (this.shake > 0.001) {
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.35;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.35;
      this.shake *= Math.exp(-dt * 7);
    }
    const fov = 52 + Math.min(16, Math.abs(this.speed) * 0.3);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
    this.snapCam = false;
  }

  /** Point for the shadow frustum (a little ahead of the car). */
  focus(out: THREE.Vector3) {
    return out.set(this.pos.x + Math.cos(this.heading) * 10, this.y, this.pos.z - Math.sin(this.heading) * 10);
  }

  update(dt: number) {
    if (!this.active) return;
    this.time += dt;
    this.obstacles = this.world.traffic.obstacles();
    const n = Math.max(1, Math.ceil(dt / (1 / 90)));
    for (let i = 0; i < n; i++) this.step(dt / n);
    this.pose(dt);
    this.spray.update(dt);
    this.updateCamera(dt);
    this.audio.update(Math.abs(this.speed) < 0.3 && !this.load ? 0.08 : this.rpm, this.load ? 1 : 0.2, this.slip);
  }
}

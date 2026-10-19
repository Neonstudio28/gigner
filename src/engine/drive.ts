import * as THREE from 'three';
import { Batcher, Kit } from '../world/core/kit';
import { vehicleBody, drawWheel, type VehicleType, type VehicleOpts, type WheelInfo } from '../world/vehicles';
import type { TownWorld } from '../world';
import { EngineAudio } from './audio';

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
  coupe: { top: 52, accel: 9.5, brake: 15, grip: 8, offroad: 0.45, steer: 0.58, gears: 5 },
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
  pivot: THREE.Group;
  spin: THREE.Group;
  info: WheelInfo;
  front: boolean;
}

const G = 9.81;
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
  private obstacles: { x: number; z: number; hl: number }[] = [];
  private time = 0;
  private slip = 0;

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
    scene.add(this.car);
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
      drawWheel(new Kit(wb, mats), info.r, info.width, info.side, info.dual);
      const spin = new THREE.Group();
      wb.build((key) => mats.get(key), spin);
      spin.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      const pivot = new THREE.Group();
      pivot.position.set(info.x, info.r, info.z);
      pivot.add(spin);
      this.car.add(pivot);
      this.wheels.push({ pivot, spin, info, front: info.x > (maxX + minX) / 2 + 0.1 });
    }
    const box = new THREE.Box3().setFromObject(this.body);
    this.len = box.max.x - box.min.x;
    this.width = Math.min(2.6, box.max.z - box.min.z);
    this.height = box.max.y;
    this.wheelbase = Math.max(1.6, maxX - minX);
    this.frontX = box.max.x;
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
    this.keys.clear();
    this.audio.stop();
  }

  place(x: number, z: number, heading: number) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.vel.set(0, 0);
    this.speed = 0;
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
      if (this.world.solidAt(wx, wz)) return true;
      for (const o of this.obstacles) if (Math.abs(wx - o.x) < o.hl && Math.abs(wz - o.z) < 1.05) return true;
    }
    return false;
  }

  private step(h: number) {
    const k = this.keys;
    const thr = k.has('KeyW') || k.has('ArrowUp') ? 1 : 0;
    const brk = k.has('KeyS') || k.has('ArrowDown') ? 1 : 0;
    const st = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0);
    const hb = k.has('Space');
    const boost = k.has('ShiftLeft') || k.has('ShiftRight');
    const sp = this.spec;
    const road = this.world.roadAt(this.pos.x, this.pos.z);
    this.onRoad = !!road && road.kind !== 'dirt';
    const surfTop = road ? (road.kind === 'dirt' ? 0.8 : 1) : 0.45 + 0.5 * sp.offroad;
    const surfGrip = road ? (road.kind === 'dirt' ? 0.8 : 1) : 0.55 + 0.45 * sp.offroad;
    const top = sp.top * surfTop * (boost ? 1.2 : 1);
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    let fwd = this.vel.x * c - this.vel.y * s;
    let lat = this.vel.x * s + this.vel.y * c;
    let a = 0;
    if (thr) a += fwd < -0.5 ? sp.brake : sp.accel * (boost ? 1.35 : 1) * Math.max(0, 1 - Math.max(0, fwd) / top);
    if (brk) a -= fwd > 0.5 ? sp.brake : sp.accel * 0.55 * Math.max(0, 1 + fwd / (sp.top * 0.25));
    a -= 0.0012 * fwd * Math.abs(fwd);
    a -= G * Math.sin(this.pitch) * 0.9;
    const coast = (road ? 0.6 : 2.2) + (!thr && !brk ? 1.1 : 0) + (hb ? 7 : 0) + (fwd > top ? 3 : 0);
    const prev = fwd;
    fwd += a * h;
    const decel = coast * h;
    if (Math.abs(fwd) <= decel && !thr && !brk) fwd = 0;
    else fwd -= Math.sign(fwd) * decel;
    if (!thr && !brk && Math.sign(fwd) !== Math.sign(prev) && prev !== 0) fwd = 0;
    lat *= Math.exp(-sp.grip * surfGrip * (hb ? 0.2 : 1) * h);
    this.slip = Math.abs(lat);
    const maxSteer = sp.steer / (1 + Math.abs(fwd) * 0.05);
    this.steer += (st * maxSteer - this.steer) * Math.min(1, h * 7);
    let yaw = (fwd / this.wheelbase) * Math.tan(this.steer);
    if (hb) yaw *= 1.45;
    this.yawRate = yaw;
    this.vel.set(fwd * c + lat * s, -fwd * s + lat * c);
    const nh = this.heading + yaw * h;
    const nx = this.pos.x + this.vel.x * h;
    const nz = this.pos.z + this.vel.y * h;
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
      const hit = before - this.vel.length();
      if (hit > 2.5) {
        this.shake = Math.min(1, hit / 15);
        this.audio.impact(hit);
      }
    }
    this.speed = this.vel.x * Math.cos(this.heading) - this.vel.y * Math.sin(this.heading);
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
      const g = this.world.groundAt(gx, gz);
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
    const ground = (hf + hr) / 2;
    const pitchT = Math.atan2(hf - hr, this.wheelbase);
    const rollT = Math.atan2(hl - hrt, this.track);
    // suspension: follow the ground, but launch off crests faster than gravity can pull us down
    const groundVel = (ground - this.lastGround) / Math.max(dt, 1e-3);
    this.lastGround = ground;
    const airborne = this.y > ground + 0.04;
    if (airborne) {
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
      w.spin.rotation.z -= (this.speed * dt) / w.info.r;
      if (w.front) w.pivot.rotation.y = this.steer;
    }
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
    this.updateCamera(dt);
    const sp = this.spec;
    const v = Math.abs(this.speed);
    const gearSpan = sp.top / sp.gears;
    const gear = Math.min(sp.gears - 1, Math.floor(v / gearSpan));
    const rpm = THREE.MathUtils.clamp(0.12 + ((v - gear * gearSpan) / gearSpan) * 0.85, 0, 1);
    const thr = this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.keys.has('KeyS') || this.keys.has('ArrowDown');
    this.audio.update(v < 0.3 ? 0.08 : rpm, thr ? 1 : 0.2, this.slip);
  }
}

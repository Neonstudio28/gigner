import * as THREE from 'three';
import type { TownWorld } from '../world';
import { Figure } from '../world/walker';

const WALK = 2.1;
const RUN = 5.6;
const RADIUS = 0.23;
const STEP = 0.62;

/**
 * On-foot mode: a third-person character that walks the streets, climbs kerbs, porches and the courthouse
 * steps, goes through open doors into the furnished buildings, and wades or swims in the river and lake.
 */
export class FootMode {
  active = false;
  readonly pos = new THREE.Vector3();
  /** Facing angle: 0 looks down +Z. */
  heading = 0;
  speed = 0;
  /** Ground speed actually covered (m/s): zero when walking into a wall. */
  pace = 0;
  indoors = false;
  swimming = false;
  /** Extra obstacles (the parked car), tested in world space. */
  blocker: ((x: number, z: number) => boolean) | null = null;

  private fig: Figure;
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0.2;
  private zoom = 1;
  private dragging = false;
  private dragAt = -10;
  private time = 0;
  private vy = 0;
  private grounded = true;
  private ceil: number | undefined;
  private camPos = new THREE.Vector3();
  private snap = true;

  constructor(
    private world: TownWorld,
    scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.fig = new Figure(world.materials, { skin: 0xe0b08a, shirt: 0xa5352f, pants: 0x34425a, hair: 0x3a2a1c, hat: 'cap' });
    this.fig.group.name = 'player';
    this.fig.group.visible = false;
    scene.add(this.fig.group);
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
      this.yaw -= e.movementX * 0.006;
      this.pitch = THREE.MathUtils.clamp(this.pitch + e.movementY * 0.004, -0.35, 1.1);
      this.dragAt = this.time;
    });
    dom.addEventListener(
      'wheel',
      (e) => {
        if (this.active) this.zoom = THREE.MathUtils.clamp(this.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.35, 2.4);
      },
      { passive: true },
    );
  }

  /** Simulated key state (scripted captures). */
  setKeys(codes: string[]) {
    this.keys = new Set(codes);
  }

  enter(x: number, z: number, heading: number) {
    this.pos.set(x, this.floor(x, z, undefined), z);
    this.heading = this.yaw = heading;
    this.pitch = 0.2;
    this.speed = this.vy = 0;
    this.grounded = true;
    this.active = true;
    this.snap = true;
    this.fig.group.visible = true;
    this.place(0);
  }

  exit() {
    this.active = false;
    this.fig.group.visible = false;
    this.keys.clear();
  }

  private floor(x: number, z: number, y: number | undefined) {
    const g = this.world.groundAt(x, z, y);
    const zn = this.world.floorAt(x, z, y);
    this.ceil = zn?.ceil;
    return zn ? Math.max(g, zn.floor) : g;
  }

  private blocked(x: number, z: number): boolean {
    const y = this.pos.y + 0.9;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const px = x + Math.cos(a) * RADIUS;
      const pz = z + Math.sin(a) * RADIUS;
      if (this.world.solidAt(px, pz, y) || this.blocker?.(px, pz)) return true;
    }
    for (const o of this.world.traffic.obstacles()) {
      const dx = x - o.x;
      const dz = z - o.z;
      if (Math.abs(dx * o.c - dz * o.s) < o.hl + RADIUS && Math.abs(dx * o.s + dz * o.c) < 1.05 + RADIUS) return true;
    }
    // a wall of ground taller than a step
    return this.grounded && this.floor(x, z, this.pos.y + STEP) - this.pos.y > STEP;
  }

  private place(dt: number) {
    const g = this.fig.group;
    g.position.copy(this.pos);
    if (this.swimming) g.position.y += Math.sin(this.time * 2.4) * 0.04;
    g.rotation.y = this.heading;
    this.fig.animate(dt, Math.min(Math.abs(this.speed), this.pace) * Math.sign(this.speed));
  }

  update(dt: number) {
    if (!this.active) return;
    this.time += dt;
    const k = this.keys;
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    if (k.has('ArrowLeft')) this.yaw += dt * 2;
    if (k.has('ArrowRight')) this.yaw -= dt * 2;
    const water = this.world.waterAt(this.pos.x, this.pos.z);
    const bed = this.floor(this.pos.x, this.pos.z, this.pos.y + STEP);
    const depth = water ? water.y - bed : 0;
    this.swimming = depth > 1.25;
    let top = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK;
    if (this.swimming) top = 1.5;
    else if (depth > 0.25) top *= THREE.MathUtils.lerp(1, 0.4, Math.min(1, depth / 1.2));
    const moving = f !== 0 || s !== 0;
    let want = 0;
    if (moving) {
      // forward is where the camera looks
      const dir = this.yaw + Math.atan2(-s, f);
      let d = dir - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 11);
      want = top;
      // the camera drifts round behind you when you are not steering it
      if (!this.dragging && this.time - this.dragAt > 1.2 && f >= 0) {
        let c = this.heading - this.yaw;
        c = Math.atan2(Math.sin(c), Math.cos(c));
        this.yaw += c * Math.min(1, dt * 1.6);
      }
    }
    this.speed += (want - this.speed) * Math.min(1, dt * (want > this.speed ? 7 : 10));
    let dx = Math.sin(this.heading) * this.speed * dt;
    let dz = Math.cos(this.heading) * this.speed * dt;
    if (this.swimming && water) {
      dx += water.fx * dt * 0.6;
      dz += water.fz * dt * 0.6;
    }
    const ox = this.pos.x;
    const oz = this.pos.z;
    if (!this.blocked(this.pos.x + dx, this.pos.z + dz)) {
      this.pos.x += dx;
      this.pos.z += dz;
    } else if (!this.blocked(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    else if (!this.blocked(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
    else this.speed = 0;
    this.pace = dt > 0 ? Math.hypot(this.pos.x - ox, this.pos.z - oz) / dt : 0;

    const ground = this.floor(this.pos.x, this.pos.z, this.pos.y + STEP);
    this.indoors = this.ceil !== undefined;
    if (this.swimming && water) {
      this.pos.y += (water.y - 1.38 - this.pos.y) * Math.min(1, dt * 6);
      this.vy = 0;
      this.grounded = false;
    } else {
      if (this.grounded && k.has('Space')) {
        this.vy = 4.4;
        this.grounded = false;
      }
      if (this.grounded && ground > this.pos.y - 0.45) this.pos.y += (ground - this.pos.y) * Math.min(1, dt * 18);
      else {
        this.grounded = false;
        this.vy -= 19 * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= ground) {
          this.pos.y = ground;
          this.vy = 0;
          this.grounded = true;
        }
      }
    }
    this.place(dt);
    this.updateCamera(dt);
  }

  private updateCamera(dt: number) {
    const cam = this.camera;
    const head = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    const dist = (this.indoors ? 2.7 : 4.6) * this.zoom;
    const cp = Math.cos(this.pitch);
    const off = new THREE.Vector3(-Math.sin(this.yaw) * cp * dist, Math.sin(this.pitch) * dist + 0.25, -Math.cos(this.yaw) * cp * dist);
    // pull the camera in front of any wall between it and the player
    let t = 1;
    const N = 14;
    for (let i = 2; i <= N; i++) {
      const u = i / N;
      if (this.world.solidAt(head.x + off.x * u, head.z + off.z * u, head.y + off.y * u)) {
        t = Math.max(0.08, (i - 1.5) / N);
        break;
      }
    }
    const want = head.clone().addScaledVector(off, t);
    if (this.ceil !== undefined) want.y = Math.min(want.y, this.ceil - 0.22);
    want.y = Math.max(want.y, this.world.groundAt(want.x, want.z, want.y + 1) + 0.25);
    this.camPos.lerp(want, this.snap ? 1 : 1 - Math.exp(-dt * 14));
    cam.position.copy(this.camPos);
    // look where the player looks, not at the player: with its back to a wall the camera becomes first-person
    const near = this.camPos.distanceTo(head);
    this.fig.group.visible = near > 0.9;
    cam.lookAt(head.x + Math.sin(this.yaw) * 12, head.y - Math.sin(this.pitch) * 12 + 1.2, head.z + Math.cos(this.yaw) * 12);
    cam.fov += (58 - cam.fov) * Math.min(1, dt * 4);
    cam.updateProjectionMatrix();
    this.snap = false;
  }

  /** Point for the shadow frustum. */
  focus(out: THREE.Vector3) {
    return out.copy(this.pos);
  }
}

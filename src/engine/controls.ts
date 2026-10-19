import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type Shot, shotVec } from '../world/shots';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Orbit camera with cinematic presets/tour, plus a pointer-lock free-fly mode for walkthroughs. */
export class CameraDirector {
  readonly orbit: OrbitControls;
  mode: 'orbit' | 'fly' = 'orbit';
  tour = false;
  flySpeed = 14;
  current = 0;
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private anim: { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; fov0: number; fov1: number; t: number; dur: number } | null = null;
  private tourClock = 0;
  onShotChange?: (s: Shot) => void;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private dom: HTMLElement,
    readonly shots: Shot[],
    private heightAt: (x: number, z: number) => number,
  ) {
    this.orbit = new OrbitControls(camera, dom);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    // allow looking up at facades from street level; ground clamp below keeps the camera above terrain
    this.orbit.maxPolarAngle = Math.PI * 0.62;
    this.orbit.minDistance = 2;
    this.orbit.maxDistance = 1800;
    this.orbit.addEventListener('start', () => {
      this.anim = null;
      this.tour = false;
    });
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    dom.addEventListener('click', () => {
      if (this.mode === 'fly' && document.pointerLockElement !== dom) dom.requestPointerLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (this.mode !== 'fly' || document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.45, 1.45);
    });
  }

  goTo(index: number, instant = false) {
    this.current = (index + this.shots.length) % this.shots.length;
    const s = this.shots[this.current];
    const { pos, target } = shotVec(s);
    if (this.mode === 'fly') this.setMode('orbit');
    const fov = s.fov ?? 50;
    if (instant) {
      this.camera.position.copy(pos);
      this.orbit.target.copy(target);
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      this.orbit.update();
      this.anim = null;
    } else {
      const dist = this.camera.position.distanceTo(pos);
      this.anim = { p0: this.camera.position.clone(), t0: this.orbit.target.clone(), p1: pos, t1: target, fov0: this.camera.fov, fov1: fov, t: 0, dur: THREE.MathUtils.clamp(dist / 60, 1.6, 4.5) };
    }
    this.onShotChange?.(s);
  }

  setMode(mode: 'orbit' | 'fly') {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'fly') {
      this.tour = false;
      this.anim = null;
      this.orbit.enabled = false;
      const d = new THREE.Vector3();
      this.camera.getWorldDirection(d);
      this.yaw = Math.atan2(-d.x, -d.z);
      this.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    } else {
      if (document.pointerLockElement) document.exitPointerLock();
      this.orbit.enabled = true;
      const d = new THREE.Vector3();
      this.camera.getWorldDirection(d);
      this.orbit.target.copy(this.camera.position).addScaledVector(d, 25);
      this.orbit.update();
    }
  }

  /** Point the sun's shadow frustum should centre on. */
  focus(out: THREE.Vector3): THREE.Vector3 {
    if (this.mode === 'orbit') return out.copy(this.orbit.target).lerp(this.camera.position, 0.15);
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    d.y = 0;
    d.normalize();
    return out.copy(this.camera.position).addScaledVector(d, 30).setY(0);
  }

  viewDistance(): number {
    return this.mode === 'orbit' ? this.camera.position.distanceTo(this.orbit.target) : Math.max(25, this.camera.position.y * 2);
  }

  update(dt: number) {
    if (this.tour && !this.anim && this.mode === 'orbit') {
      this.tourClock += dt;
      if (this.tourClock > 9) {
        this.tourClock = 0;
        this.goTo(this.current + 1);
      } else {
        // slow drift around the target while holding a shot
        const off = this.camera.position.clone().sub(this.orbit.target);
        off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.035);
        this.camera.position.copy(this.orbit.target).add(off);
      }
    }
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = ease(a.t);
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      // arc over the town on long moves
      this.camera.position.y += Math.sin(e * Math.PI) * Math.min(80, a.p0.distanceTo(a.p1) * 0.15);
      this.orbit.target.lerpVectors(a.t0, a.t1, e);
      this.camera.fov = THREE.MathUtils.lerp(a.fov0, a.fov1, e);
      this.camera.updateProjectionMatrix();
      if (a.t >= 1) this.anim = null;
    }
    if (this.mode === 'orbit') {
      this.orbit.update();
      const minY = this.heightAt(this.camera.position.x, this.camera.position.z) + 0.8;
      if (this.camera.position.y < minY) this.camera.position.y = minY;
      return;
    }
    const k = this.keys;
    const fast = k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const v = new THREE.Vector3();
    if (k.has('KeyW') || k.has('ArrowUp')) v.add(fwd);
    if (k.has('KeyS') || k.has('ArrowDown')) v.sub(fwd);
    if (k.has('KeyD') || k.has('ArrowRight')) v.add(right);
    if (k.has('KeyA') || k.has('ArrowLeft')) v.sub(right);
    if (k.has('KeyE') || k.has('Space')) v.y += 1;
    if (k.has('KeyQ') || k.has('KeyC')) v.y -= 1;
    if (v.lengthSq() > 0) this.camera.position.addScaledVector(v.normalize(), this.flySpeed * fast * dt);
    const ground = this.heightAt(this.camera.position.x, this.camera.position.z) + 1.7;
    if (this.camera.position.y < ground) this.camera.position.y = ground;
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }
}

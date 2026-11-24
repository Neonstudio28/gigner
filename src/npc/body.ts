import * as THREE from 'three';
import { npcLib, node, type NpcLib, type ClipMeta } from './lib';

export type NpcTints = Record<string, THREE.ColorRepresentation>;
const SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.7);
const tmp = new THREE.Color();

/** One animated townsperson: a skinned copy of a character model with its own skeleton, mixer and held prop. */
export class NpcBody {
  readonly group = new THREE.Group();
  readonly model: string;
  readonly height: number;
  private lib: NpcLib;
  private mesh: THREE.SkinnedMesh;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private bones = new Map<string, THREE.Object3D>();
  private current = '';
  private held: THREE.Mesh | null = null;
  private heldName = '';
  private own: THREE.BufferGeometry | null = null;
  /** Playback rate of the current clip (locomotion clips are scaled to the ground speed). */
  rate = 1;

  constructor(model: string, tints?: NpcTints, lib = npcLib()!) {
    this.lib = lib;
    this.model = lib.geo.has(model) ? model : 'casual_m_1';
    const meta = lib.man.characters[this.model];
    const arm = lib.armature.clone(true);
    arm.traverse((o) => this.bones.set(o.name, o));
    const skeleton = new THREE.Skeleton(lib.joints.map((n) => this.bones.get(n) as THREE.Bone), lib.inverses);
    this.mesh = new THREE.SkinnedMesh(this.dress(tints), lib.material);
    this.mesh.name = this.model;
    this.mesh.bind(skeleton, lib.bind);
    this.mesh.castShadow = true;
    this.mesh.boundingSphere = SPHERE;
    this.group.add(arm, this.mesh);
    this.group.scale.setScalar(meta?.scale ?? 1);
    this.height = 1.9 * (meta?.scale ?? 1);
    this.mixer = new THREE.AnimationMixer(arm);
    this.play('idle', 0);
  }

  /** The model's geometry, with its own colour buffer when any labelled part (skin, hair, shirt...) is retinted. */
  private dress(tints?: NpcTints) {
    const src = this.lib.geo.get(this.model)!;
    if (!tints || !Object.keys(tints).length) return src;
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(src.attributes)) if (k !== 'color') g.setAttribute(k, a);
    g.setIndex(src.index);
    const col = (src.getAttribute('color') as THREE.BufferAttribute).clone();
    const uv = src.getAttribute('uv');
    for (let i = 0; i < col.count; i++) {
      const t = tints[this.lib.slotLabel[Math.floor(uv.getX(i) * 16)] ?? ''];
      if (t === undefined) continue;
      tmp.set(t);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', col);
    this.own = g;
    return g;
  }

  get clip() {
    return this.current;
  }
  meta(name = this.current): ClipMeta | undefined {
    return this.lib.man.clips[name];
  }
  /** True once a one-shot clip has played through. */
  get done() {
    const a = this.actions.get(this.current);
    return !!a && a.loop === THREE.LoopOnce && !a.isRunning();
  }
  /** Seconds into the current clip. */
  get time() {
    return this.actions.get(this.current)?.time ?? 0;
  }

  /** Crossfades to a clip. One-shot clips hold their last frame until something else is played. */
  play(name: string, fade = 0.25, restart = false) {
    if (!this.lib.clips.has(name)) name = 'idle';
    if (name === this.current && !restart) return;
    let a = this.actions.get(name);
    if (!a) {
      a = this.mixer.clipAction(this.lib.clips.get(name)!);
      if (!this.lib.man.clips[name]?.loop) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions.set(name, a);
    }
    const prev = this.actions.get(this.current);
    a.reset();
    a.enabled = true;
    a.setEffectiveWeight(1);
    a.play();
    if (prev && prev !== a && fade > 0) a.crossFadeFrom(prev, fade, false);
    else if (prev && prev !== a) prev.stop();
    this.current = name;
    this.rate = 1;
  }

  /** Starts the clip part-way in, so a crowd is not in step. */
  offset(t: number) {
    const a = this.actions.get(this.current);
    if (a) a.time = t % a.getClip().duration;
  }

  /** Puts a prop in the hands (or takes it away with null). */
  hold(prop: string | null) {
    if ((prop ?? '') === this.heldName) return;
    if (this.held) this.held.removeFromParent();
    this.held = null;
    this.heldName = prop ?? '';
    const p = prop ? this.lib.props.get(prop) : undefined;
    if (!p) return;
    const m = new THREE.Mesh(p.geo, this.lib.material);
    m.castShadow = this.mesh.castShadow;
    m.matrixAutoUpdate = false;
    m.matrix.copy(p.offset);
    this.bones.get(p.bone)?.add(m);
    this.held = m;
  }
  get holding() {
    return this.heldName;
  }

  /** Turns the head toward a yaw offset (radians, relative to the body) on top of the playing clip. */
  look(yaw: number, pitch = 0) {
    const h = this.bones.get(node('head'));
    if (!h) return;
    h.rotateY(THREE.MathUtils.clamp(yaw, -1.1, 1.1));
    if (pitch) h.rotateX(THREE.MathUtils.clamp(pitch, -0.5, 0.5));
  }

  set shadows(on: boolean) {
    this.mesh.castShadow = on;
    if (this.held) this.held.castShadow = on;
  }

  update(dt: number) {
    const a = this.actions.get(this.current);
    if (a) a.timeScale = this.rate;
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.group.removeFromParent();
    this.own?.getAttribute('color') && this.own.dispose();
  }
}

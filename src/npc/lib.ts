import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ClipMeta {
  dur: number;
  loop: boolean;
  /** Ground speed in m/s that the cycle is drawn for (locomotion clips). */
  speed?: number;
  /** Where a prop for this clip is held: a hand bone or 'both'. */
  prop?: string;
  seat?: number;
  wall?: boolean;
}
export interface CharMeta {
  palette: Record<string, string>;
  sex: 'm' | 'f';
  scale: number;
  tris: number;
}
interface Manifest {
  characters: Record<string, CharMeta>;
  props: Record<string, { bone: string }>;
  clips: Record<string, ClipMeta>;
  bones: string[];
  slots: Record<string, number>;
}
export interface NpcProp {
  geo: THREE.BufferGeometry;
  bone: string;
  /** Places the prop (modelled on the rest pose) in its bone's frame. */
  offset: THREE.Matrix4;
}
export interface NpcLib {
  man: Manifest;
  /** The bone tree, cloned for every body. */
  armature: THREE.Object3D;
  joints: string[];
  inverses: THREE.Matrix4[];
  bind: THREE.Matrix4;
  geo: Map<string, THREE.BufferGeometry>;
  clips: Map<string, THREE.AnimationClip>;
  props: Map<string, NpcProp>;
  material: THREE.Material;
  slotLabel: string[];
}

let LIB: NpcLib | null = null;
export const npcLib = () => LIB;
export const hasNpc = (model?: string) => !!model && !!LIB?.geo.has(model);
export const node = (bone: string) => THREE.PropertyBinding.sanitizeNodeName(bone);

/** Loads the rigged townsfolk (tools/blender/npc.py): one skeleton, a mesh per character, the clips and the hand props. */
export async function loadNpcLib(base: string): Promise<NpcLib | null> {
  if (LIB) return LIB;
  try {
    const [gltf, man] = await Promise.all([
      new GLTFLoader().loadAsync(`${base}assets/models/npc.glb`),
      fetch(`${base}assets/models/npc.json`).then((r) => r.json() as Promise<Manifest>),
    ]);
    gltf.scene.updateMatrixWorld(true);
    const rig = gltf.scene.getObjectByName('rig')!;
    const geo = new Map<string, THREE.BufferGeometry>();
    let first: THREE.SkinnedMesh | null = null;
    const skinned: THREE.SkinnedMesh[] = [];
    rig.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
    });
    for (const m of skinned) {
      first ??= m;
      geo.set(m.name, m.geometry);
      m.removeFromParent();
    }
    if (!first) throw new Error('npc.glb has no skinned meshes');
    const props = new Map<string, NpcProp>();
    const rest = new Map<string, THREE.Matrix4>();
    rig.traverse((o) => rest.set(o.name, o.matrixWorld.clone()));
    for (const [name, p] of Object.entries(man.props)) {
      const m = gltf.scene.getObjectByName(`prop_${name}`) as THREE.Mesh | undefined;
      const bone = node(p.bone);
      if (!m?.geometry || !rest.has(bone)) continue;
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      props.set(name, { geo: g, bone, offset: rest.get(bone)!.clone().invert() });
    }
    const hips = node('hips');
    const clips = new Map<string, THREE.AnimationClip>();
    for (const c of gltf.animations) {
      // rotations drive everything; only the hips also translate (bob, sitting down, crouching)
      c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion') || t.name === `${hips}.position`);
      clips.set(c.name, c);
    }
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 });
    material.name = 'npc';
    const slotLabel: string[] = [];
    for (const [label, i] of Object.entries(man.slots)) slotLabel[i] = label;
    LIB = { man, armature: rig, joints: first.skeleton.bones.map((b) => b.name), inverses: first.skeleton.boneInverses, bind: first.bindMatrix.clone(), geo, clips, props, material, slotLabel };
  } catch (err) {
    console.error('[npc] failed to load the townsfolk', err);
    LIB = null;
  }
  return LIB;
}

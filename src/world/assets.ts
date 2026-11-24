import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Blender-built models (see tools/blender/CONTRACT.md). Each family is one GLB plus a JSON manifest. Materials
 * are named `<key>` or `<key>__<label>`: the key picks the engine material, the base colour is baked into
 * vertex colours, and labelled parts can be recoloured where the asset is placed.
 */

export interface AssetPart {
  /** Indexed geometry in the asset's own frame: position, normal, uv. */
  geo: THREE.BufferGeometry;
  /** Engine material key (paint, gloss, metal, chrome, rubber, glass, clear, light, atlas). */
  key: string;
  /** Recolour label ('' when the colour is fixed). */
  label: string;
  color: THREE.Color;
}

export interface AssetInfo {
  size: [number, number, number];
  min: [number, number, number];
  tris: number;
  parts: Record<string, [number, number, number]>;
  [extra: string]: unknown;
}

export interface Asset {
  name: string;
  family: string;
  /** Footprint in game axes: width (x), height (y), depth (z) and the lowest corner. */
  w: number;
  h: number;
  d: number;
  min: THREE.Vector3;
  info: AssetInfo;
  /** The asset's own mesh, without its movable child parts. */
  parts: AssetPart[];
  /** Movable child parts (wheels, limbs, rotors) with their pivot in the asset's frame. */
  children: Map<string, { pivot: THREE.Vector3; parent: string; parts: AssetPart[] }>;
}

const ASSETS = new Map<string, Asset>();
const ATLASES = new Map<string, THREE.Texture>();
const missing = new Set<string>();

export function asset(name: string): Asset | undefined {
  const a = ASSETS.get(name);
  if (!a && !missing.has(name)) {
    missing.add(name);
    console.warn(`[assets] missing model "${name}"`);
  }
  return a;
}
export const hasAsset = (name: string) => ASSETS.has(name);
export const assetNames = (family?: string) => [...ASSETS.values()].filter((a) => !family || a.family === family).map((a) => a.name);
export const atlases = () => ATLASES;

const KEYS = new Set(['paint', 'gloss', 'metal', 'chrome', 'rubber', 'glass', 'clear', 'light', 'atlas']);

function parseMaterial(m: THREE.Material): { key: string; label: string } {
  // Blender appends .001 to duplicated names
  const name = m.name.replace(/\.\d+$/, '');
  const i = name.indexOf('__');
  const key = i < 0 ? name : name.slice(0, i);
  const label = i < 0 ? '' : name.slice(i + 2);
  return { key: KEYS.has(key) ? key : 'paint', label: /^c[0-9a-f]{6}$/.test(label) ? '' : label };
}

/** Every mesh under `node` that belongs to it (stops at named child parts), as geometry in `root`'s frame. */
function collect(node: THREE.Object3D, rootInv: THREE.Matrix4, own: string, out: Map<string, { key: string; label: string; color: THREE.Color; geos: THREE.BufferGeometry[] }>) {
  const visit = (o: THREE.Object3D) => {
    const nm = (o.userData.name as string | undefined) ?? o.name;
    if (o !== node && nm.startsWith(own + '.')) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const { key, label } = parseMaterial(mat);
      const g = mesh.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'uv') g.deleteAttribute(a);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld));
      const id = `${key}|${label}|${key === 'atlas' ? '' : mat.color.getHexString()}`;
      let e = out.get(id);
      if (!e) out.set(id, (e = { key, label, color: key === 'atlas' ? new THREE.Color(1, 1, 1) : mat.color.clone(), geos: [] }));
      e.geos.push(g);
    }
    for (const c of o.children) visit(c);
  };
  visit(node);
}

/** Bakes each colour into a vertex-colour attribute and merges everything that shares a key and label. */
function bake(groups: Map<string, { key: string; label: string; color: THREE.Color; geos: THREE.BufferGeometry[] }>): AssetPart[] {
  const byPart = new Map<string, AssetPart & { geos: THREE.BufferGeometry[] }>();
  for (const e of groups.values()) {
    const id = `${e.key}|${e.label}`;
    let p = byPart.get(id);
    if (!p) byPart.set(id, (p = { key: e.key, label: e.label, color: e.label ? e.color.clone() : new THREE.Color(1, 1, 1), geo: null!, geos: [] }));
    for (const g of e.geos) {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      // labelled parts stay white so the placement colour multiplies in cleanly
      const c = e.label ? new THREE.Color(1, 1, 1) : e.color;
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      p.geos.push(g);
    }
  }
  const out: AssetPart[] = [];
  for (const p of byPart.values()) {
    const geo = p.geos.length === 1 ? p.geos[0] : mergeGeometries(p.geos, false);
    if (geo) out.push({ geo, key: p.key, label: p.label, color: p.color });
  }
  return out;
}

/** Loads asset families (GLB + manifest). A family that is not there yet is skipped with a warning. */
export async function loadAssets(base: string, families: string[]): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(
    families.map(async (family) => {
      try {
        const [gltf, info] = await Promise.all([
          loader.loadAsync(`${base}assets/models/${family}.glb`),
          fetch(`${base}assets/models/${family}.json`).then((r) => (r.ok ? (r.json() as Promise<Record<string, AssetInfo>>) : ({} as Record<string, AssetInfo>))),
        ]);
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m?.map && m.name.startsWith('atlas') && !ATLASES.has(family)) ATLASES.set(family, m.map);
        });
        for (const node of gltf.scene.children) {
          const name = (node.userData.name as string | undefined) ?? node.name;
          const inv = node.matrixWorld.clone().invert();
          const groups = new Map();
          collect(node, inv, name, groups);
          const parts = bake(groups);
          const children: Asset['children'] = new Map();
          node.traverse((o) => {
            const nm = (o.userData.name as string | undefined) ?? o.name;
            if (o === node || !nm.startsWith(name + '.')) return;
            const cg = new Map();
            // child geometry is kept relative to its own pivot; nested children (forearm under arm) are their own entries
            collect(o, o.matrixWorld.clone().invert(), name, cg);
            const pivot = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv);
            const pn = o.parent && o.parent !== node ? (((o.parent.userData.name as string | undefined) ?? o.parent.name).split('.').pop() ?? '') : '';
            children.set(nm.slice(name.length + 1), { pivot, parent: pn, parts: bake(cg) });
          });
          const box = new THREE.Box3();
          for (const p of parts) {
            p.geo.computeBoundingBox();
            box.union(p.geo.boundingBox!);
          }
          for (const c of children.values())
            for (const p of c.parts) {
              p.geo.computeBoundingBox();
              box.union(p.geo.boundingBox!.clone().translate(c.pivot));
            }
          const size = box.getSize(new THREE.Vector3());
          ASSETS.set(name, { name, family, w: size.x, h: size.y, d: size.z, min: box.min.clone(), info: info[name] ?? { size: [size.x, size.z, size.y], min: [0, 0, 0], tris: 0, parts: {} }, parts, children });
        }
      } catch (err) {
        console.warn(`[assets] family "${family}" not loaded`, err);
      }
    }),
  );
}

export type Tints = Record<string, THREE.ColorRepresentation>;

/** One part ready for the static batches: coloured, with the world material's `layer` and `pbr` attributes. */
export function stamp(part: AssetPart, matrix: THREE.Matrix4, rough: number, metal: number, tint?: THREE.Color | null, recolor?: THREE.ColorRepresentation): THREE.BufferGeometry {
  const g = part.geo.clone();
  const n = g.attributes.position.count;
  const base = part.label ? (recolor !== undefined ? new THREE.Color(recolor) : part.color) : null;
  if (base || tint) {
    const col = g.attributes.color as THREE.BufferAttribute;
    const r = (base?.r ?? 1) * (tint?.r ?? 1);
    const gg = (base?.g ?? 1) * (tint?.g ?? 1);
    const b = (base?.b ?? 1) * (tint?.b ?? 1);
    for (let i = 0; i < n; i++) col.setXYZ(i, col.getX(i) * r, col.getY(i) * gg, col.getZ(i) * b);
  }
  g.setAttribute('layer', new THREE.Float32BufferAttribute(new Float32Array(n).fill(-1), 1));
  const pbr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    pbr[i * 2] = rough;
    pbr[i * 2 + 1] = metal;
  }
  g.setAttribute('pbr', new THREE.Float32BufferAttribute(pbr, 2));
  g.applyMatrix4(matrix);
  return g;
}

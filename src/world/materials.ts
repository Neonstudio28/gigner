import * as THREE from 'three';
import type { MatResolver, MatSpec } from './core/kit';
import type { LayerDef } from './textures';

/** Shared uniform used by foliage/flag vertex animation. */
export const windUniform = { value: 0 };

const LAYER_SIZE = 512;

/**
 * One MeshStandardMaterial for almost everything: tiling textures live in a texture array and
 * roughness/metalness come from vertex attributes, so a merged chunk needs a single draw call.
 */
function worldMaterial(layers: THREE.DataArrayTexture, decal: boolean): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 1 });
  if (decal) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -4;
  }
  m.onBeforeCompile = (s) => {
    s.uniforms.uLayers = { value: layers };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float layer;\nattribute vec2 pbr;\nvarying float vLayer;\nvarying vec2 vPbr;\nvarying vec2 vTileUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvLayer = layer;\nvPbr = pbr;\nvTileUv = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2DArray uLayers;\nvarying float vLayer;\nvarying vec2 vPbr;\nvarying vec2 vTileUv;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (vLayer > -0.5) diffuseColor.rgb *= texture(uLayers, vec3(vTileUv, floor(vLayer + 0.5))).rgb;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vPbr.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPbr.y;');
  };
  m.customProgramCacheKey = () => 'pinehollow-world';
  return m;
}

export class MaterialLib implements MatResolver {
  private specs = new Map<string, MatSpec>();
  private mats = new Map<string, THREE.Material>();
  readonly layers: THREE.DataArrayTexture;

  constructor(layerDefs: LayerDef[]) {
    const S = LAYER_SIZE;
    const data = new Uint8Array(S * S * 4 * layerDefs.length);
    layerDefs.forEach((L, i) => {
      const img = L.canvas.getContext('2d')!.getImageData(0, 0, S, S).data;
      // flip rows so v = 0 is the canvas bottom, matching CanvasTexture.flipY
      for (let y = 0; y < S; y++) data.set(img.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), (i * S * S + y * S) * 4);
      this.specs.set(L.name, { bucket: 'world', layer: i, tile: L.tile, rough: L.rough, metal: L.metal });
      this.specs.set(`${L.name}@decal`, { bucket: 'decal', layer: i, tile: L.tile, rough: L.rough, metal: L.metal });
    });
    const tex = new THREE.DataArrayTexture(data, S, S, layerDefs.length);
    tex.format = THREE.RGBAFormat;
    tex.type = THREE.UnsignedByteType;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    this.layers = tex;

    const base: [string, string, number, number][] = [
      ['paint', 'world', 0.86, 0],
      ['gloss', 'world', 0.3, 0.12],
      ['metal', 'world', 0.3, 0.85],
      ['chrome', 'world', 0.15, 1],
      ['rubber', 'world', 0.95, 0],
      ['decal', 'decal', 0.86, 0],
      ['glass', 'glass', 0.08, 0.4],
      ['light', 'light', 1, 0],
      ['wire', 'wire', 0.6, 0],
      ['water', 'water', 0.05, 0.3],
    ];
    for (const [key, bucket, rough, metal] of base) this.specs.set(key, { bucket, layer: -1, tile: 1, rough, metal });

    this.set('world', worldMaterial(tex, false));
    this.set('decal', worldMaterial(tex, true));
    this.set('glass', new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.8 }));
    // Unlit, pushed above 1.0 so bloom picks up lamps and neon.
    this.set('light', new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.2, 2.2, 2.2) }));
    this.set('wire', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    this.set('water', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.3, envMapIntensity: 1.3 }));
  }

  private set(key: string, m: THREE.Material) {
    m.name = key;
    this.mats.set(key, m);
  }

  spec(key: string): MatSpec {
    if (key.startsWith('signs')) return { bucket: key, layer: -1, tile: 1, rough: 0.55, metal: 0 };
    const s = this.specs.get(key);
    if (!s) throw new Error(`Unknown material ${key}`);
    return s;
  }

  addSignPage(index: number, tex: THREE.Texture) {
    this.set(`signs${index}`, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, alphaTest: 0.5 }));
  }

  get(bucket: string): THREE.Material {
    const m = this.mats.get(bucket);
    if (!m) throw new Error(`Unknown material bucket ${bucket}`);
    return m;
  }

  all(): THREE.Material[] {
    return [...this.mats.values()];
  }
}

/** Patches a standard material with gentle wind sway (height-weighted, phase from instance position). */
export function addWindSway(mat: THREE.MeshStandardMaterial, strength: number, minY = 1.5) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = windUniform;
    shader.vertexShader =
      'uniform float uWind;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 swayP = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 swayP = vec2(0.0);
        #endif
        float swayH = max(position.y - ${minY.toFixed(2)}, 0.0);
        float swayA = sin(uWind * 1.3 + swayP.x * 0.05 + swayP.y * 0.07) * 0.6 + sin(uWind * 2.3 + swayP.x * 0.13) * 0.3;
        transformed.x += swayA * swayH * ${strength.toFixed(4)};
        transformed.z += cos(uWind * 1.1 + swayP.y * 0.06) * swayH * ${(strength * 0.6).toFixed(4)};`,
      );
  };
  mat.customProgramCacheKey = () => `sway${strength}${minY}`;
}

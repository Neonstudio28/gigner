import * as THREE from 'three';
import type { MatResolver, MatSpec } from './core/kit';
import type { LayerDef } from './textures';
import { windowMaterial } from './windowMaterial';

/** Shared uniform used by foliage/flag vertex animation. */
export const windUniform = { value: 0 };
/** Weather/time-of-day uniforms shared by the world and glass materials. */
export const surfaceUniforms = { uWet: { value: 0 }, uWindowGlow: { value: 0 }, uIndoor: { value: 0.3 } };

const NOISE_GLSL = `
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

const LAYER_SIZE = 512;

/**
 * One MeshStandardMaterial for almost everything: tiling textures live in a texture array and
 * roughness/metalness come from vertex attributes, so a merged chunk needs a single draw call.
 */
function worldMaterial(layers: THREE.DataArrayTexture, decal: boolean, flat = true): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: 1, metalness: 1 });
  if (decal) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -4;
  }
  m.onBeforeCompile = (s) => {
    s.uniforms.uLayers = { value: layers };
    s.uniforms.uWet = surfaceUniforms.uWet;
    s.uniforms.uIndoor = surfaceUniforms.uIndoor;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float layer;\nattribute vec2 pbr;\nvarying float vLayer;\nvarying vec2 vPbr;\nvarying vec2 vTileUv;\nvarying vec2 vWetXZ;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvLayer = layer;\nvPbr = pbr;\nvTileUv = uv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWetXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2DArray uLayers;\nuniform float uWet;\nuniform float uIndoor;\nvarying float vLayer;\nvarying vec2 vPbr;\nvarying vec2 vTileUv;\nvarying vec2 vWetXZ;' + NOISE_GLSL)
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (vLayer > -0.5) diffuseColor.rgb *= texture(uLayers, vec3(vTileUv, floor(vLayer + 0.5))).rgb;')
      .replace(
        '#include <roughnessmap_fragment>',
        `float indoorK = step(1.5, vPbr.x);
        float roughnessFactor = vPbr.x - 2.0 * indoorK;
        {
          // rain-soaked look: up-facing surfaces darken, turn glossy and collect puddles
          vec3 wn = cross(dFdx(vViewPosition), dFdy(vViewPosition));
          float up = dot(wn, wn) > 1e-24 ? dot(normalize(wn), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)) : 0.0;
          float wet = uWet * smoothstep(0.72, 0.95, up);
          float puddle = smoothstep(0.62, 0.78, wNoise(vWetXZ * 0.22) * 0.7 + wNoise(vWetXZ * 0.9) * 0.3);
          roughnessFactor = mix(roughnessFactor, mix(roughnessFactor * 0.38, 0.05, puddle), wet);
          diffuseColor.rgb *= 1.0 - wet * (0.22 + 0.25 * puddle);
        }`,
      )
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPbr.y;')
      // rooms are lit by their own lamps: a flat fill on everything built indoors
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * indoorK * uIndoor;');
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
      ['window', 'window', 0.06, 0],
      ['clear', 'clear', 0.05, 0.2],
      ['light', 'light', 1, 0],
      ['wire', 'wire', 0.6, 0],
      ['water', 'water', 0.05, 0.3],
    ];
    for (const [key, bucket, rough, metal] of base) this.specs.set(key, { bucket, layer: -1, tile: 1, rough, metal });

    this.set('world', worldMaterial(tex, false));
    this.set('decal', worldMaterial(tex, true));
    // Blender-built assets keep their own normals (smooth with sharp edges) instead of per-face shading
    this.set('smooth', worldMaterial(tex, false, false));
    for (const key of ['paint', 'gloss', 'metal', 'chrome', 'rubber']) this.specs.set(`${key}~`, { ...this.specs.get(key)!, bucket: 'smooth' });
    const glass = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.8 });
    glass.onBeforeCompile = (s) => {
      s.uniforms.uWindowGlow = surfaceUniforms.uWindowGlow;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWinWorld;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWinWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uWindowGlow;\nvarying vec3 vWinWorld;' + NOISE_GLSL)
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            // about half of the windows are lit after dark, in warm incandescent tones
            vec2 cell = floor(vWinWorld.xz * 0.45) + floor(vWinWorld.y / 2.9) * 17.0;
            float on = step(0.48, wHash(cell));
            vec3 tone = mix(vec3(1.0, 0.68, 0.36), vec3(1.0, 0.86, 0.6), wHash(cell + 3.1));
            totalEmissiveRadiance += uWindowGlow * on * tone * 0.0;
          }`,
        );
    };
    glass.customProgramCacheKey = () => 'pinehollow-glass';
    this.set('glass', glass);
    this.set('window', windowMaterial(surfaceUniforms.uWindowGlow));
    // real see-through glazing for the buildings you can walk into
    this.set('clear', new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.0, depthWrite: false }));
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
    if (key.startsWith('signs') || key.startsWith('atlas:')) return { bucket: key, layer: -1, tile: 1, rough: 0.55, metal: 0 };
    const s = this.specs.get(key);
    if (!s) throw new Error(`Unknown material ${key}`);
    return s;
  }

  addSignPage(index: number, tex: THREE.Texture) {
    this.set(`signs${index}`, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, alphaTest: 0.5 }));
  }

  /** Printed faces (labels, sign symbols, screens) of one Blender asset family share a small atlas texture. */
  addAtlas(family: string, tex: THREE.Texture) {
    this.set(`atlas:${family}`, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 }));
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
export function addWindSway(mat: THREE.MeshStandardMaterial, strength: number, minY = 1.5, cull: -1 | 0 | 1 = 0, range = 70) {
  // cull 1 keeps only the instances within `range` of the camera, -1 only those beyond it (detail tiers that hand over per tree)
  const test = cull > 0 ? '>' : '<=';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = windUniform;
    shader.vertexShader =
      'uniform float uWind;\n' +
      shader.vertexShader
        .replace(
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
        )
        .replace(
          '#include <project_vertex>',
          cull === 0
            ? '#include <project_vertex>'
            : `#include <project_vertex>
        #ifdef USE_INSTANCING
          if (distance(instanceMatrix[3].xyz, cameraPosition) ${test} ${range.toFixed(1)}) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        #endif`,
        );
  };
  mat.customProgramCacheKey = () => `sway${strength}${minY}${cull}${range}`;
}

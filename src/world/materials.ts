import * as THREE from 'three';
import type { TextureSet } from './textures';

/** Shared uniform used by foliage/flag vertex animation. */
export const windUniform = { value: 0 };

export class MaterialLib {
  private mats = new Map<string, THREE.Material>();

  constructor(t: TextureSet) {
    const std = (p: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.86, metalness: 0, ...p });

    this.set('paint', std());
    this.set('gloss', std({ roughness: 0.3, metalness: 0.12 }));
    this.set('metal', std({ roughness: 0.3, metalness: 0.85 }));
    this.set('glass', std({ roughness: 0.08, metalness: 0.4, envMapIntensity: 1.8 }));
    this.set('rubber', std({ roughness: 0.95 }));
    this.set('wire', std({ flatShading: false, roughness: 0.6 }));
    this.set('decal', std({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    // Unlit, pushed above 1.0 so bloom picks up lamps and neon.
    this.set('light', new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.2, 2.2, 2.2) }));

    this.set('brickRed', std({ map: t.brickRed, roughness: 0.92 }));
    this.set('brickTan', std({ map: t.brickTan, roughness: 0.92 }));
    this.set('brickPaint', std({ map: t.brickPaint, roughness: 0.9 }));
    this.set('brickBrown', std({ map: t.brickBrown, roughness: 0.92 }));
    this.set('siding', std({ map: t.siding }));
    this.set('boards', std({ map: t.boards, roughness: 0.9 }));
    this.set('roofMetal', std({ map: t.roofMetal, roughness: 0.5, metalness: 0.3 }));
    this.set('shingle', std({ map: t.shingle, roughness: 0.95 }));
    this.set('cinder', std({ map: t.cinder, roughness: 0.92 }));
    this.set('concrete', std({ map: t.concrete, roughness: 0.95 }));
    this.set('asphalt', std({ map: t.asphalt, roughness: 0.95 }));
    this.set('planks', std({ map: t.planks, roughness: 0.9 }));
    this.set('rollup', std({ map: t.rollup, roughness: 0.55, metalness: 0.3 }));
    this.set('awningRed', std({ map: t.awningRed, roughness: 0.8 }));
    this.set('awningGreen', std({ map: t.awningGreen, roughness: 0.8 }));
  }

  set(key: string, m: THREE.Material) {
    m.name = key;
    this.mats.set(key, m);
  }

  get(key: string): THREE.Material {
    const m = this.mats.get(key);
    if (!m) throw new Error(`Unknown material ${key}`);
    return m;
  }

  signKey(tex: THREE.Texture): string {
    const k = 'sign:' + tex.uuid;
    if (!this.mats.has(k)) this.set(k, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, alphaTest: 0.5 }));
    return k;
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

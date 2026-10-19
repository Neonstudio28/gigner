import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  SMAAEffect,
  SMAAPreset,
  VignetteEffect,
  HueSaturationEffect,
  BrightnessContrastEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { Effect } from 'postprocessing';

/** Replaces NaN/Inf pixels before bloom so a single bad pixel can't black out the mip-chain blur. */
class SanitizeEffect extends Effect {
  constructor() {
    super(
      'SanitizeEffect',
      `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        bool bad = any(isnan(c)) || any(isinf(c));
        outputColor = vec4(bad ? vec3(0.0) : min(c, vec3(64.0)), inputColor.a);
      }`,
    );
  }
}

/** Flat shading derives normals from screen derivatives; sub-pixel triangles give a zero vector → NaN. */
export function patchFlatShadingNaN() {
  const chunk = THREE.ShaderChunk.normal_fragment_begin;
  const bad = 'vec3 normal = normalize( cross( fdx, fdy ) );';
  if (chunk.includes(bad)) {
    THREE.ShaderChunk.normal_fragment_begin = chunk.replace(
      bad,
      'vec3 flatN = cross( fdx, fdy );\n\tvec3 normal = dot( flatN, flatN ) > 1e-24 ? normalize( flatN ) : vec3( 0.0, 0.0, 1.0 );',
    );
  }
}
import type { Quality } from './sky';

/**
 * Post stack (pmndrs/postprocessing + N8AO): ambient occlusion → bloom → ACES filmic →
 * light grade → vignette → SMAA. Mirrors the default Unreal "cinematic" look of the references.
 */
export class PostFX {
  readonly composer: EffectComposer;
  readonly ao: N8AOPostPass;
  readonly bloom: BloomEffect;
  readonly tone: ToneMappingEffect;
  readonly saturation: HueSaturationEffect;
  readonly contrast: BrightnessContrastEffect;
  readonly vignette: VignetteEffect;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, quality: Quality) {
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(scene, camera));

    this.ao = new N8AOPostPass(scene, camera, size.x, size.y);
    this.ao.configuration.aoRadius = 2.4;
    this.ao.configuration.distanceFalloff = 0.9;
    this.ao.configuration.intensity = 2.6;
    this.ao.configuration.color = new THREE.Color(0x0b0d12);
    this.ao.configuration.halfRes = quality !== 'high';
    this.ao.configuration.gammaCorrection = false;
    this.ao.setQualityMode(quality === 'high' ? 'High' : quality === 'medium' ? 'Medium' : 'Low');
    this.composer.addPass(this.ao);
    this.composer.addPass(new EffectPass(camera, new SanitizeEffect()));

    this.bloom = new BloomEffect({ intensity: 0.42, luminanceThreshold: 0.86, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.72 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.saturation = new HueSaturationEffect({ saturation: 0.03 });
    this.contrast = new BrightnessContrastEffect({ brightness: 0.02, contrast: 0.05 });
    this.vignette = new VignetteEffect({ darkness: 0.36, offset: 0.34 });
    this.composer.addPass(new EffectPass(camera, this.bloom, this.tone, this.saturation, this.contrast, this.vignette));
    this.composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: quality === 'low' ? SMAAPreset.MEDIUM : SMAAPreset.HIGH })));
  }

  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
  }

  render(dt: number) {
    this.composer.render(dt);
  }
}

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
  NoiseEffect,
  BlendFunction,
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

/** Lift/gamma/gain + saturation/contrast + split toning (teal shadows / warm highlights). */
export class GradeEffect extends Effect {
  constructor() {
    super(
      'GradeEffect',
      `uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain;
      uniform float uSat; uniform float uContrast; uniform float uSplit;
      uniform vec3 uShadowTint; uniform vec3 uHighTint;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat);
        c = (c - 0.5) * uContrast + 0.5;
        c = c * uGain + uLift * (1.0 - c);
        c = pow(max(c, 0.0), 1.0 / uGamma);
        float l2 = dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 tint = mix(uShadowTint, uHighTint, smoothstep(0.12, 0.8, l2));
        c = mix(c, c * (tint * 2.0), uSplit * 0.18);
        outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
      }`,
      {
        uniforms: new Map<string, THREE.Uniform>([
          ['uLift', new THREE.Uniform(new THREE.Vector3())],
          ['uGamma', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
          ['uGain', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
          ['uSat', new THREE.Uniform(1)],
          ['uContrast', new THREE.Uniform(1)],
          ['uSplit', new THREE.Uniform(0)],
          ['uShadowTint', new THREE.Uniform(new THREE.Color(0.5, 0.5, 0.5))],
          ['uHighTint', new THREE.Uniform(new THREE.Color(0.5, 0.5, 0.5))],
        ]),
      },
    );
  }
  u(name: string) {
    return this.uniforms.get(name)!;
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
  readonly grade: GradeEffect;
  readonly grain: NoiseEffect;
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
    this.grade = new GradeEffect();
    this.grain = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN });
    this.grain.blendMode.opacity.value = 0.05;
    this.vignette = new VignetteEffect({ darkness: 0.42, offset: 0.3 });
    this.composer.addPass(new EffectPass(camera, this.bloom, this.tone, this.grade, this.vignette, this.grain));
    this.composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: quality === 'low' ? SMAAPreset.MEDIUM : SMAAPreset.HIGH })));
  }

  applyGrade(g: { saturation: number; contrast: number; lift: [number, number, number]; gain: [number, number, number]; split: number; shadowTint: number; highTint: number }, bloom: number, grain: number) {
    this.grade.u('uSat').value = g.saturation;
    this.grade.u('uContrast').value = g.contrast;
    (this.grade.u('uLift').value as THREE.Vector3).set(...g.lift);
    (this.grade.u('uGain').value as THREE.Vector3).set(...g.gain);
    this.grade.u('uSplit').value = g.split;
    (this.grade.u('uShadowTint').value as THREE.Color).setHex(g.shadowTint);
    (this.grade.u('uHighTint').value as THREE.Color).setHex(g.highTint);
    this.bloom.intensity = bloom;
    this.grain.blendMode.opacity.value = grain;
  }

  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
  }

  render(dt: number) {
    this.composer.render(dt);
  }
}

import * as THREE from 'three';
import { Pass } from 'postprocessing';
import type { SkyRig } from './sky';
import type { Lamp } from '../world';
import { fogUniforms, SURFACE_LAMPS } from './atmosphere';

/**
 * Volumetric fog: a half-resolution raymarch through exponential height fog with drifting 3D noise banks.
 * Sunlight is scattered with a Henyey-Greenstein phase and occluded by the sun's shadow map near the camera
 * (light shafts through trees and buildings) and by a screen-space sky-visibility march farther out (shafts
 * past ridges and rooftops); it is also dimmed by the fog above, so it reaches the valley floor only where
 * the fog thins. Street lamps, lit canopies and neon add coloured glows with the analytic single-scattering
 * integral for point lights (Sun et al. 2005). A depth-aware blur and upsample composites the result over the
 * scene in linear HDR, before bloom and tone mapping, so lamp halos bloom like the lamps themselves.
 * Structure after three-good-godrays (raymarch the shadow map, bilateral blur, depth-aware composite).
 */

export interface FogSettings {
  enabled: boolean;
  /** Extinction per metre at the bottom of the fog (0.02 ≈ 150 m visibility). */
  density: number;
  /** How fast the fog thins with height (1/m): 0.025 halves it every ~28 m. */
  falloff: number;
  /** Height (m) of the dense layer's top; below it the density is constant. */
  base: number;
  /** Patchiness 0..1 from drifting noise banks. */
  noise: number;
  /** Size of the drifting banks (m). */
  noiseScale: number;
  /** Wind (m/s) and the compass bearing it blows toward. */
  windSpeed: number;
  windDir: number;
  /** Sunlight scattered in the fog. */
  sun: number;
  /** Forward scattering (Henyey-Greenstein g): bright glare toward the sun. */
  anisotropy: number;
  /** How much sunlight gets down into thick fog (0 = blocked by the layer above, 1 = physical). */
  penetration: number;
  /** Sky light scattered in the fog (its overall brightness). */
  ambient: number;
  /** Contrast of light shafts past ridges, trees and roofs when facing the sun. */
  shafts: number;
  /** Glow of street lamps, lit canopies and neon in the fog. */
  lamps: number;
  /** Raymarched range (m); the cheaper per-material haze takes over beyond it. */
  range: number;
  steps: number;
}

export const DEFAULT_FOG: FogSettings = {
  enabled: true,
  density: 0.016,
  falloff: 0.022,
  base: 6,
  noise: 0.55,
  noiseScale: 420,
  windSpeed: 2.2,
  windDir: 70,
  sun: 1,
  anisotropy: 0.62,
  penetration: 0.35,
  ambient: 1,
  shafts: 0.8,
  lamps: 0.6,
  range: 950,
  steps: 40,
};

const MAX_LAMPS = 32;

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`;

const common = /* glsl */ `
#include <packing>
uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
varying vec2 vUv;
float linDepth(vec2 uv) {
  return -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar);
}`;

const marchFrag = /* glsl */ `
${common}
uniform sampler3D tNoise;
uniform sampler2DShadow tShadow;
uniform mat4 uShadowMat;
uniform float uShadowOn;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform float uDensity;
uniform float uFalloff;
uniform float uBase;
uniform float uNoise;
uniform float uNoiseScale;
uniform vec3 uWind;
uniform float uRange;
uniform float uSteps;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uAniso;
uniform float uPen;
uniform vec3 uAmbCol;
uniform vec2 uSunUv;
uniform float uSunVis;
uniform float uShafts;
uniform vec4 uLampPos[MAX_LAMPS];
uniform vec4 uLampCol[MAX_LAMPS];
uniform int uLampCount;

const float PI = 3.14159265;

float layer(float y) {
  return uDensity * exp(-max(y - uBase, 0.0) * uFalloff);
}
float densityAt(vec3 p) {
  float h = layer(p.y);
  if (uNoise <= 0.0) return h;
  vec3 q = p / uNoiseScale + uWind;
  // broad banks plus finer wisps, stretched flat like valley fog
  float n = texture(tNoise, q * vec3(1.0, 2.6, 1.0)).r * 0.65 + texture(tNoise, q * vec3(3.1, 6.0, 3.1) + uWind * 0.7).g * 0.35;
  return h * mix(1.0, clamp((n - 0.28) * 2.6, 0.0, 2.2), uNoise);
}
float hg(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5));
}
// interleaved gradient noise: per-pixel jitter that the blur dissolves
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  float depth = texture2D(tDepth, vUv).r;
  vec4 vp = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rayV = normalize(vp.xyz / vp.w);
  vec3 dir = normalize(mat3(uCamWorld) * rayV);
  bool sky = depth >= 1.0;
  float dist = sky ? 1e6 : linDepth(vUv) / max(-rayV.z, 1e-4);
  float L = min(dist, uRange);

  // how much open sky lies between this pixel and the sun on screen: occludes the sun past the shadow map
  float vis = 1.0;
  float rays = 0.0;
  float shaft = clamp(uSunVis * uShafts, 0.0, 1.0);
  if (shaft > 0.0) {
    vec2 delta = (uSunUv - vUv) / 40.0;
    vec2 uv = vUv + delta * ign(gl_FragCoord.xy + 3.7);
    float acc = 0.0;
    float glow = 0.0;
    float wsum = 0.0;
    float w = 1.0;
    for (int i = 0; i < 40; i++) {
      uv += delta;
      bool off = uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0;
      float open = off ? 1.0 : step(1.0, texture2D(tDepth, uv).r);
      acc += open * w;
      // open sky close to the sun is what pours through the gaps as streaks
      glow += open * w * exp(-length((uv - uSunUv) * vec2(1.0, 0.75)) * 5.0);
      wsum += w;
      w *= 0.965;
    }
    vis = mix(1.0, acc / wsum, shaft);
    rays = glow / wsum * shaft;
  }

  float c = dot(dir, uSunDir);
  vec3 sunL = uSunCol * mix(hg(c, uAniso), 0.0795775, 0.25);
  float j = ign(gl_FragCoord.xy);
  vec3 scat = vec3(0.0);
  float T = 1.0;
  float t0 = 0.0;
  for (int i = 0; i < 64; i++) {
    if (float(i) >= uSteps) break;
    // steps crowd near the camera, where the shafts and banks are
    float a = (float(i) + 1.0) / uSteps;
    float t1 = L * a * a;
    float ds = t1 - t0;
    vec3 p = uCamPos + dir * mix(t0, t1, j);
    t0 = t1;
    float sigma = densityAt(p);
    if (sigma < 1e-7) continue;
    float lit = vis;
    if (uShadowOn > 0.5) {
      vec4 sc = uShadowMat * vec4(p, 1.0);
      vec3 s3 = sc.xyz / sc.w;
      if (s3.x > 0.0 && s3.y > 0.0 && s3.x < 1.0 && s3.y < 1.0 && s3.z < 1.0) lit = texture(tShadow, vec3(s3.xy, s3.z - 0.0006));
    }
    // sunlight is thinned by the fog above on its way down: the uniform slab up to the layer top, then the thinning part
    float tau = (uDensity * max(uBase - p.y, 0.0) + layer(max(p.y, uBase)) / uFalloff) / max(uSunDir.y, 0.03);
    vec3 Lin = sunL * (lit * exp(-tau * uPen)) + uAmbCol;
    float Ts = exp(-sigma * ds);
    scat += T * Lin * (1.0 - Ts);
    T *= Ts;
    if (T < 0.002) break;
  }

  // crepuscular streaks: lit only where there is fog in front to scatter them
  scat += sunL * (rays * 6.0 * (1.0 - T));

  // lamps: closed-form in-scattering of a point light along the ray (inverse square, attenuated to the camera);
  // the extra falloff keeps each glow a halo round its lamp rather than a veil over the street
  float Lr = min(dist, 2500.0);
  for (int i = 0; i < MAX_LAMPS; i++) {
    if (i >= uLampCount) break;
    vec3 oq = uLampPos[i].xyz - uCamPos;
    float tc = dot(oq, dir);
    float h = max(length(oq - dir * tc), 0.35);
    float I = (atan((Lr - tc) / h) - atan(-tc / h)) / h;
    float tcl = clamp(tc, 0.0, Lr);
    float sig = layer(uCamPos.y + dir.y * tcl);
    scat += uLampCol[i].rgb * (uLampCol[i].a * sig * I * exp(-sig * (tcl + h) - h * 0.04));
  }
  gl_FragColor = vec4(scat, T);
}`;

const blurFrag = /* glsl */ `
${common}
uniform sampler2D tFog;
uniform vec2 uStep;
void main() {
  float d0 = linDepth(vUv);
  vec4 sum = vec4(0.0);
  float ws = 0.0;
  for (int i = -4; i <= 4; i++) {
    vec2 uv = vUv + uStep * float(i);
    float d = linDepth(uv);
    float w = exp(-float(i * i) / 10.0) * exp(-abs(d - d0) / (d0 * 0.06 + 0.4));
    sum += texture2D(tFog, uv) * w;
    ws += w;
  }
  gl_FragColor = sum / max(ws, 1e-5);
}`;

const compFrag = /* glsl */ `
${common}
uniform sampler2D tColor;
uniform sampler2D tFog;
uniform vec2 uLow;
void main() {
  vec4 col = texture2D(tColor, vUv);
  float d0 = linDepth(vUv);
  vec4 acc = vec4(0.0);
  float ws = 0.0;
  // depth-aware upsample: favour the low-res neighbours at this pixel's depth (no halos round silhouettes)
  for (int k = 0; k < 4; k++) {
    vec2 o = (vec2(float(k - (k / 2) * 2), float(k / 2)) - 0.5) * uLow;
    vec2 uv = vUv + o;
    float w = 1.0 / (abs(linDepth(uv) - d0) / max(d0, 1.0) + 0.015);
    acc += texture2D(tFog, uv) * w;
    ws += w;
  }
  vec4 fog = acc / ws;
  gl_FragColor = vec4(col.rgb * fog.a + fog.rgb, col.a);
}`;

/** A small tiling value-noise volume, used when the physical sky (and its baked cloud noise) is off. */
function fallbackNoise(): THREE.Data3DTexture {
  const S = 32;
  const data = new Uint8Array(S * S * S * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 255;
  for (let i = 0; i < S * S * S; i++) {
    data[i * 4] = rnd();
    data[i * 4 + 1] = rnd();
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.Data3DTexture(data, S, S, S);
  t.format = THREE.RGBAFormat;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

export class VolumetricFogPass extends Pass {
  readonly settings: FogSettings = { ...DEFAULT_FOG };
  /** Lamps switched on (0 by day, 1 at night); multiplied by settings.lamps. */
  lampsOn = 0;
  private march: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private comp: THREE.ShaderMaterial;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private scale: number;
  private wind = new THREE.Vector3();
  private lamps: Lamp[] = [];
  private v = new THREE.Vector3();

  constructor(
    private cam: THREE.PerspectiveCamera,
    private sky: SkyRig,
    noise: THREE.Texture | null,
    quality: 'low' | 'medium' | 'high',
  ) {
    super('VolumetricFogPass');
    this.needsDepthTexture = true;
    this.scale = quality === 'high' ? 0.5 : quality === 'medium' ? 0.42 : 0.34;
    this.settings.steps = quality === 'high' ? 40 : quality === 'medium' ? 30 : 22;
    const shared = { tDepth: { value: null as THREE.Texture | null }, uNear: { value: 0.4 }, uFar: { value: 21000 } };
    const defines = { MAX_LAMPS };
    this.march = new THREE.ShaderMaterial({
      defines,
      vertexShader: vert,
      fragmentShader: marchFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...shared,
        tNoise: { value: noise ?? fallbackNoise() },
        tShadow: { value: null },
        uShadowMat: { value: new THREE.Matrix4() },
        uShadowOn: { value: 0 },
        uInvProj: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uDensity: { value: 0 },
        uFalloff: { value: 0.02 },
        uBase: { value: 0 },
        uNoise: { value: 0 },
        uNoiseScale: { value: 400 },
        uWind: { value: this.wind },
        uRange: { value: 900 },
        uSteps: { value: 40 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color() },
        uAniso: { value: 0.6 },
        uPen: { value: 0.3 },
        uAmbCol: { value: new THREE.Color() },
        uSunUv: { value: new THREE.Vector2() },
        uSunVis: { value: 0 },
        uShafts: { value: 0 },
        uLampPos: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4()) },
        uLampCol: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4()) },
        uLampCount: { value: 0 },
      },
    });
    this.blur = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: blurFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: { ...shared, tFog: { value: null }, uStep: { value: new THREE.Vector2() } },
    });
    this.comp = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: compFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: { ...shared, tColor: { value: null }, tFog: { value: null }, uLow: { value: new THREE.Vector2() } },
    });
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, opts);
    this.fullscreenMaterial = this.march;
  }

  setLamps(lamps: Lamp[]) {
    this.lamps = lamps;
  }

  override setDepthTexture(depthTexture: THREE.Texture) {
    this.march.uniforms.tDepth.value = depthTexture;
    this.blur.uniforms.tDepth.value = depthTexture;
    this.comp.uniforms.tDepth.value = depthTexture;
  }

  override setSize(width: number, height: number) {
    const w = Math.max(32, Math.round(width * this.scale));
    const h = Math.max(32, Math.round(height * this.scale));
    this.rtA.setSize(w, h);
    this.rtB.setSize(w, h);
    this.comp.uniforms.uLow.value.set(1 / w, 1 / h);
  }

  /** Advances the drifting banks (call once per frame with the frame time). */
  tick(dt: number) {
    const s = this.settings;
    const a = (s.windDir * Math.PI) / 180;
    // the noise is sampled at p / noiseScale + wind: drift in noise units
    this.wind.x -= (Math.sin(a) * s.windSpeed * dt) / s.noiseScale;
    this.wind.z -= (-Math.cos(a) * s.windSpeed * dt) / s.noiseScale;
    this.wind.y -= (0.08 * s.windSpeed * dt) / s.noiseScale;
  }

  private update() {
    const s = this.settings;
    const u = this.march.uniforms;
    const cam = this.cam;
    cam.updateMatrixWorld();
    for (const m of [this.march, this.blur, this.comp]) {
      m.uniforms.uNear.value = cam.near;
      m.uniforms.uFar.value = cam.far;
    }
    u.uInvProj.value.copy(cam.projectionMatrixInverse);
    u.uCamWorld.value.copy(cam.matrixWorld);
    u.uCamPos.value.copy(cam.position);
    u.uDensity.value = s.density;
    u.uFalloff.value = Math.max(1e-4, s.falloff);
    u.uBase.value = s.base;
    u.uNoise.value = s.noise;
    u.uNoiseScale.value = Math.max(20, s.noiseScale);
    u.uRange.value = s.range;
    u.uSteps.value = Math.round(s.steps);
    u.uAniso.value = s.anisotropy;
    u.uPen.value = s.penetration;
    // sun: the directional light as the scene sees it; sky light: the haze colour the materials fade into
    const sun = this.sky.sun;
    u.uSunDir.value.copy(this.sky.dir);
    u.uSunCol.value.copy(sun.color).multiplyScalar(sun.intensity * s.sun * Math.max(0, Math.min(1, this.sky.dir.y * 8)));
    u.uAmbCol.value.copy(this.sky.fogColor).multiplyScalar(s.ambient * Math.max(0.35, this.sky.exposure));
    const sm = sun.shadow.map;
    const shadowOn = !!sm?.depthTexture && sun.castShadow;
    u.uShadowOn.value = shadowOn ? 1 : 0;
    if (shadowOn) {
      u.tShadow.value = sm!.depthTexture;
      u.uShadowMat.value.copy(sun.shadow.matrix);
    }
    // where the sun is on screen (shafts fade as it leaves the view or sets behind the camera)
    this.v.copy(this.sky.dir).multiplyScalar(5000).add(cam.position).project(cam);
    const facing = this.v.z < 1 ? 1 : 0;
    const sx = this.v.x * 0.5 + 0.5;
    const sy = this.v.y * 0.5 + 0.5;
    const edge = Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5));
    u.uSunUv.value.set(sx, sy);
    u.uSunVis.value = facing * (1 - THREE.MathUtils.smoothstep(edge, 0.55, 1.2)) * THREE.MathUtils.smoothstep(this.sky.dir.y, -0.02, 0.06);
    u.uShafts.value = s.shafts;
    // the nearest, brightest lamps (in front of or close to the camera)
    const amt = s.lamps * this.lampsOn;
    let n = 0;
    if (amt > 0.001 && this.lamps.length) {
      const fwd = this.v.set(0, 0, -1).applyQuaternion(cam.quaternion);
      const cx = cam.position.x;
      const cy = cam.position.y;
      const cz = cam.position.z;
      const scored: [number, Lamp][] = [];
      for (const l of this.lamps) {
        const dx = l.x - cx;
        const dy = l.y - cy;
        const dz = l.z - cz;
        const d = Math.hypot(dx, dy, dz);
        if (d > 600) continue;
        const ahead = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / Math.max(d, 1);
        scored.push([d * (ahead < -0.3 && d > 25 ? 3 : 1) - l.power * 12, l]);
      }
      scored.sort((a, b) => a[0] - b[0]);
      for (const [, l] of scored.slice(0, MAX_LAMPS)) {
        u.uLampPos.value[n].set(l.x, l.y, l.z, 1);
        u.uLampCol.value[n].set(l.r, l.g, l.b, l.power * amt * 12);
        if (n < SURFACE_LAMPS) {
          this.v.set(l.x, l.y, l.z).applyMatrix4(cam.matrixWorldInverse);
          fogUniforms.uLampV.value[n].set(this.v.x, this.v.y, this.v.z, 1);
          fogUniforms.uLampC.value[n].set(l.r, l.g, l.b, l.power * this.lampsOn * 16);
        }
        n++;
      }
    }
    fogUniforms.uLampN.value = Math.min(n, SURFACE_LAMPS);
    u.uLampCount.value = n;
    // the per-material haze starts where the raymarch stops
    fogUniforms.uFogStart.value = s.enabled ? s.range : 0;
  }

  override render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, outputBuffer: THREE.WebGLRenderTarget) {
    this.update();
    const w = this.rtA.width;
    const h = this.rtA.height;
    this.fullscreenMaterial = this.march;
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.scene, this.camera);
    this.blur.uniforms.tFog.value = this.rtA.texture;
    this.blur.uniforms.uStep.value.set(1.4 / w, 0);
    this.fullscreenMaterial = this.blur;
    renderer.setRenderTarget(this.rtB);
    renderer.render(this.scene, this.camera);
    this.blur.uniforms.tFog.value = this.rtB.texture;
    this.blur.uniforms.uStep.value.set(0, 1.4 / h);
    renderer.setRenderTarget(this.rtA);
    renderer.render(this.scene, this.camera);
    this.comp.uniforms.tColor.value = inputBuffer.texture;
    this.comp.uniforms.tFog.value = this.rtA.texture;
    this.fullscreenMaterial = this.comp;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}

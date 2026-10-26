import * as THREE from 'three';

/*
 * River and lake water.
 *
 * The ripple field is the heightfield wave simulation from jeantimex/threejs-water (MIT; after Evan
 * Wallace's WebGL Water): a ping-pong texture holding height (R), velocity (G) and the surface normal (BA),
 * advanced with a 4-neighbour Laplacian, damped, and disturbed by smooth cosine "drops". Here it covers a
 * window that follows the camera across the river and lake (raindrops, rising fish, a car splashing the
 * shallows), and is blended into the normal of a physically based surface: Fresnel reflection of the sky
 * from the physical material, flow-aligned waves on the river, wind ripples on the lake, Beer-Lambert style
 * colour and clarity from the per-vertex depth, and foam along the shore.
 */

const SIM = 256;
/** Metres covered by the ripple window. */
const SIM_SIZE = 110;

const quadVert = /* glsl */ `
varying vec2 coord;
void main() {
  coord = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const dropFrag = /* glsl */ `
precision highp float;
const float PI = 3.141592653589793;
uniform sampler2D tInput;
uniform vec2 center;
uniform float radius;
uniform float strength;
varying vec2 coord;
void main() {
  vec4 info = texture2D(tInput, coord);
  float drop = max(0.0, 1.0 - length(coord - center) / radius);
  drop = 0.5 - cos(drop * PI) * 0.5;
  info.r += drop * strength;
  gl_FragColor = info;
}`;

const updateFrag = /* glsl */ `
precision highp float;
uniform sampler2D tInput;
uniform vec2 delta;
uniform float damping;
varying vec2 coord;
void main() {
  vec4 info = texture2D(tInput, coord);
  vec2 dx = vec2(delta.x, 0.0);
  vec2 dy = vec2(0.0, delta.y);
  float average = (texture2D(tInput, coord - dx).r + texture2D(tInput, coord - dy).r + texture2D(tInput, coord + dx).r + texture2D(tInput, coord + dy).r) * 0.25;
  info.g += (average - info.r) * 2.0;
  info.g *= damping;
  info.r += info.g;
  // fade toward the window edge so ripples never hit a hard border
  vec2 e = min(coord, 1.0 - coord);
  info.r *= smoothstep(0.0, 0.06, min(e.x, e.y));
  gl_FragColor = info;
}`;

const normalFrag = /* glsl */ `
precision highp float;
uniform sampler2D tInput;
uniform vec2 delta;
uniform float cell;
varying vec2 coord;
void main() {
  vec4 info = texture2D(tInput, coord);
  vec3 dx = vec3(cell, texture2D(tInput, vec2(coord.x + delta.x, coord.y)).r - info.r, 0.0);
  vec3 dy = vec3(0.0, texture2D(tInput, vec2(coord.x, coord.y + delta.y)).r - info.r, cell);
  info.ba = normalize(cross(dy, dx)).xz;
  gl_FragColor = info;
}`;

const shiftFrag = /* glsl */ `
precision highp float;
uniform sampler2D tInput;
uniform vec2 offset;
varying vec2 coord;
void main() {
  vec2 c = coord + offset;
  gl_FragColor = (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0) ? vec4(0.0) : texture2D(tInput, c);
}`;

export class WaterFX {
  readonly material: THREE.MeshPhysicalMaterial;
  readonly uniforms = {
    uTime: { value: 0 },
    uRipples: { value: null as THREE.Texture | null },
    uSimCenter: { value: new THREE.Vector2(1e6, 1e6) },
    uSimSize: { value: SIM_SIZE },
    uShallow: { value: new THREE.Color(0x4f9a90) },
    uDeep: { value: new THREE.Color(0x173c42) },
    uFoam: { value: new THREE.Color(0xe9efec) },
    uWind: { value: new THREE.Vector2(0.8, 0.35) },
  };
  private a: THREE.WebGLRenderTarget;
  private b: THREE.WebGLRenderTarget;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private scene = new THREE.Scene();
  private quad: THREE.Mesh;
  private drop: THREE.ShaderMaterial;
  private step: THREE.ShaderMaterial;
  private norm: THREE.ShaderMaterial;
  private shift: THREE.ShaderMaterial;
  private dropTimer = 0;
  private lastCar = new THREE.Vector2(NaN, NaN);
  private seed = 1;

  constructor(private renderer: THREE.WebGLRenderer) {
    const type = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.FloatType;
    const opts = { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false };
    this.a = new THREE.WebGLRenderTarget(SIM, SIM, opts);
    this.b = new THREE.WebGLRenderTarget(SIM, SIM, opts);
    const delta = new THREE.Vector2(1 / SIM, 1 / SIM);
    const mk = (frag: string, u: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: frag, uniforms: { tInput: { value: null }, ...u }, depthTest: false, depthWrite: false });
    this.drop = mk(dropFrag, { center: { value: new THREE.Vector2() }, radius: { value: 0.01 }, strength: { value: 0 } });
    this.step = mk(updateFrag, { delta: { value: delta }, damping: { value: 0.986 } });
    this.norm = mk(normalFrag, { delta: { value: delta }, cell: { value: (2 * SIM_SIZE) / SIM } });
    this.shift = mk(shiftFrag, { offset: { value: new THREE.Vector2() } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.drop);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    for (const t of [this.a, this.b]) {
      renderer.setRenderTarget(t);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
    this.uniforms.uRipples.value = this.a.texture;

    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.07,
      metalness: 0,
      ior: 1.333,
      specularIntensity: 1,
      envMapIntensity: 1.05,
      transparent: true,
      depthWrite: true,
    });
    this.material.name = 'water';
    this.material.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.uniforms);
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float wdepth;\nattribute vec2 flow;\nvarying float vDepth;\nvarying vec2 vFlow;\nvarying vec3 vWPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDepth = wdepth;\nvFlow = flow;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform sampler2D uRipples;
          uniform vec2 uSimCenter;
          uniform float uSimSize;
          uniform vec3 uShallow;
          uniform vec3 uDeep;
          uniform vec3 uFoam;
          uniform vec2 uWind;
          varying float vDepth;
          varying vec2 vFlow;
          varying vec3 vWPos;
          float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float wNoise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          float wFbm(vec2 p) { return wNoise(p) * 0.55 + wNoise(p * 2.13 + 7.1) * 0.3 + wNoise(p * 4.7 - 3.3) * 0.15; }
          vec2 wGrad(vec2 p) {
            const float e = 0.06;
            float c = wFbm(p);
            return vec2(wFbm(p + vec2(e, 0.0)) - c, wFbm(p + vec2(0.0, e)) - c) / e;
          }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float clarity = 1.0 - exp(-vDepth * 0.55);
          vec3 body = mix(uShallow, uDeep, clarity);
          float foamN = wNoise(vWPos.xz * 0.9 + vec2(uTime * 0.3, -uTime * 0.2)) * 0.6 + wNoise(vWPos.xz * 2.7 - uTime * 0.4) * 0.4;
          float foam = smoothstep(0.32, 0.02, vDepth) * smoothstep(0.45, 0.8, foamN);
          diffuseColor.rgb = mix(body, uFoam, foam * 0.85);
          diffuseColor.a = mix(0.55, 0.97, smoothstep(0.0, 1.6, vDepth)) + foam * 0.3;`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            vec2 p = vWPos.xz;
            float sp = length(vFlow);
            // river: two flow-advected phases cross-faded (flow-map technique) so the waves never smear
            float ph0 = fract(uTime * 0.18);
            float ph1 = fract(uTime * 0.18 + 0.5);
            float w0 = 1.0 - abs(1.0 - 2.0 * ph0);
            vec2 gf = mix(wGrad(p * 0.42 - vFlow * ph1 * 2.6 + 3.7), wGrad(p * 0.42 - vFlow * ph0 * 2.6), w0);
            // lake: wind ripples at three scales
            vec2 gw = wGrad(p * 0.09 + uWind * uTime * 0.05) * 0.5 + wGrad(p * 0.31 + uWind * uTime * 0.16) * 0.35 + wGrad(p * 1.1 - uWind.yx * uTime * 0.35) * 0.15;
            vec2 grad = mix(gw * 0.22, gf * 0.26 + gw * 0.08, smoothstep(0.05, 0.4, sp));
            // simulated ripples near the camera
            vec2 suv = (p - uSimCenter) / (2.0 * uSimSize) + 0.5;
            if (suv.x > 0.0 && suv.y > 0.0 && suv.x < 1.0 && suv.y < 1.0) {
              vec2 rn = texture2D(uRipples, suv).ba;
              grad += rn * 1.6;
            }
            float fade = 1.0 - smoothstep(60.0, 900.0, length(vWPos - cameraPosition));
            vec3 nW = normalize(vec3(-grad.x * fade, 1.0, -grad.y * fade));
            normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
          }`,
        );
    };
    this.material.customProgramCacheKey = () => 'pinehollow-water';
  }

  /** Puts the water material on the terrain's river and lake meshes. */
  attach(root: THREE.Object3D) {
    root.traverse((o) => {
      if ((o.name === 'river' || o.name === 'lake') && (o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = this.material;
    });
  }

  private pass(mat: THREE.ShaderMaterial, swap = true) {
    mat.uniforms.tInput.value = this.a.texture;
    this.quad.material = mat;
    this.renderer.setRenderTarget(this.b);
    this.renderer.render(this.scene, this.cam);
    if (swap) {
      const t = this.a;
      this.a = this.b;
      this.b = t;
    }
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** A smooth cosine drop at world (x, z), radius r metres. */
  addDrop(x: number, z: number, r: number, strength: number) {
    const c = this.uniforms.uSimCenter.value;
    const u = (x - c.x) / (2 * SIM_SIZE) + 0.5;
    const v = (z - c.y) / (2 * SIM_SIZE) + 0.5;
    if (u < 0.02 || v < 0.02 || u > 0.98 || v > 0.98) return;
    this.drop.uniforms.center.value.set(u, v);
    this.drop.uniforms.radius.value = r / (2 * SIM_SIZE);
    this.drop.uniforms.strength.value = strength;
    this.pass(this.drop);
  }

  /**
   * Advances the ripples. `focus` is the camera target (or the car); `wet` 0..1 brings rain; `car` makes a
   * wake when the player drives along the shallows; `isWater` filters where drops may land.
   */
  update(dt: number, time: number, focus: THREE.Vector3, wet: number, isWater: (x: number, z: number) => boolean, car?: THREE.Vector3 | null) {
    this.uniforms.uTime.value = time;
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAuto = r.autoClear;
    r.autoClear = false;
    // keep the window centred on the focus, shifting the field by whole texels so ripples stay put
    const c = this.uniforms.uSimCenter.value;
    const texel = (2 * SIM_SIZE) / SIM;
    if (Math.abs(focus.x - c.x) > SIM_SIZE * 0.3 || Math.abs(focus.z - c.y) > SIM_SIZE * 0.3) {
      const nx = Math.round(focus.x / texel) * texel;
      const nz = Math.round(focus.z / texel) * texel;
      if (c.x < 1e5) {
        this.shift.uniforms.offset.value.set((nx - c.x) / (2 * SIM_SIZE), (nz - c.y) / (2 * SIM_SIZE));
        this.pass(this.shift);
      }
      c.set(nx, nz);
    }
    // ambient drops: rain when the weather is wet, otherwise the odd rising fish or insect
    this.dropTimer += dt;
    const rate = wet > 0.5 ? 70 * wet : 1.2;
    let n = 0;
    while (this.dropTimer > 1 / rate && n < 24) {
      this.dropTimer -= 1 / rate;
      n++;
      const x = c.x + (this.rand() - 0.5) * SIM_SIZE * 1.8;
      const z = c.y + (this.rand() - 0.5) * SIM_SIZE * 1.8;
      if (!isWater(x, z)) continue;
      if (wet > 0.5) this.addDrop(x, z, 0.35 + this.rand() * 0.3, -0.06 - this.rand() * 0.05);
      else this.addDrop(x, z, 0.6 + this.rand() * 0.8, (this.rand() < 0.5 ? -1 : 1) * 0.12);
    }
    if (this.dropTimer > 1) this.dropTimer = 0;
    // a car running along the shallows pushes a bow wave
    if (car) {
      if (!Number.isNaN(this.lastCar.x) && isWater(car.x, car.z)) {
        const d = Math.hypot(car.x - this.lastCar.x, car.z - this.lastCar.y);
        if (d > 0.2) this.addDrop(car.x, car.z, 1.6, Math.min(0.5, d * 0.25));
      }
      this.lastCar.set(car.x, car.z);
    }
    this.pass(this.step);
    this.pass(this.step);
    this.pass(this.norm);
    this.uniforms.uRipples.value = this.a.texture;
    r.setRenderTarget(prevTarget);
    r.autoClear = prevAuto;
  }
}

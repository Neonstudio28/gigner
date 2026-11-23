import * as THREE from 'three';

/*
 * Physically based sky: single-scattering atmosphere (Rayleigh, Mie, ozone) and raymarched volumetric
 * clouds, adapted from leoawen/volumetric_cloud_atmosphere_scattering (MIT): the periodic Perlin-Worley
 * and Worley noise bakes, the analytic air-mass transmittance, the 16-step in-scattering integral, the
 * dual-lobe Henyey-Greenstein phase, Beer + powder light, and temporal reprojection of the cloud pass.
 *
 * Differences for a town game: clouds live in a flat slab above the valley (curvature is negligible
 * within the ~40 km we march), the sky renders at half resolution into the scene background (so terrain
 * and buildings occlude it), and the same shader in dome form feeds a PMREM environment map so
 * reflections and ambient light match the sky that is on screen.
 */

export interface CloudSettings {
  coverage: number;
  density: number;
  base: number;
  top: number;
}

const BAKE_BASE = 96;
const BAKE_DETAIL = 32;

const quadVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const noiseFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSlice;
uniform float uMode;

vec3 hash33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
vec3 hash33w(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
// periodic Perlin noise (tiles every 'period' cells)
float pnoise(vec3 p, float period) {
  vec3 pi = floor(p);
  vec3 pf = fract(p);
  vec3 w = pf * pf * (3.0 - 2.0 * pf);
  vec3 p0 = mod(pi, period);
  vec3 p1 = mod(pi + 1.0, period);
  float n000 = dot(hash33(vec3(p0.x, p0.y, p0.z)), pf - vec3(0, 0, 0));
  float n100 = dot(hash33(vec3(p1.x, p0.y, p0.z)), pf - vec3(1, 0, 0));
  float n010 = dot(hash33(vec3(p0.x, p1.y, p0.z)), pf - vec3(0, 1, 0));
  float n110 = dot(hash33(vec3(p1.x, p1.y, p0.z)), pf - vec3(1, 1, 0));
  float n001 = dot(hash33(vec3(p0.x, p0.y, p1.z)), pf - vec3(0, 0, 1));
  float n101 = dot(hash33(vec3(p1.x, p0.y, p1.z)), pf - vec3(1, 0, 1));
  float n011 = dot(hash33(vec3(p0.x, p1.y, p1.z)), pf - vec3(0, 1, 1));
  float n111 = dot(hash33(vec3(p1.x, p1.y, p1.z)), pf - vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, w.x), mix(n010, n110, w.x), w.y), mix(mix(n001, n101, w.x), mix(n011, n111, w.x), w.y), w.z);
}
float fbmP(vec3 p, float period) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    f += amp * pnoise(p, period);
    p *= 2.0;
    period *= 2.0;
    amp *= 0.5;
  }
  return f + 0.5;
}
// periodic Worley noise, 1 at the cell centres ("billows")
float worley(vec3 p, float period) {
  vec3 id = floor(p);
  vec3 f = fract(p);
  float md = 1.0;
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
      for (int z = -1; z <= 1; z++) {
        vec3 nb = vec3(float(x), float(y), float(z));
        vec3 pt = hash33w(mod(id + nb, period));
        md = min(md, length(nb + pt - f));
      }
  return 1.0 - clamp(md, 0.0, 1.0);
}
float remap(float v, float a, float b, float c, float d) { return c + (v - a) * (d - c) / (b - a); }
void main() {
  vec3 p = vec3(vUv, uSlice);
  if (uMode < 0.5) {
    float perlin = clamp(fbmP(p * 4.0, 4.0), 0.0, 1.0);
    float w = worley(p * 4.0, 4.0) * 0.625 + worley(p * 8.0, 8.0) * 0.25 + worley(p * 16.0, 16.0) * 0.125;
    float pw = clamp(remap(perlin, 0.0, 1.0, w, 1.0), 0.0, 1.0);
    gl_FragColor = vec4(pw, w, perlin, 1.0);
  } else {
    float d = worley(p * 4.0, 4.0) * 0.625 + worley(p * 8.0, 8.0) * 0.25 + worley(p * 16.0, 16.0) * 0.125;
    gl_FragColor = vec4(d, d, d, 1.0);
  }
}`;

const skyCommon = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform vec3 uSunDir;
uniform float uSunPower;
uniform float uAltitude;
uniform float uCoverage;
uniform float uDensity;
uniform float uBase;
uniform float uTop;
uniform vec3 uWind;
uniform sampler3D tBase;
uniform sampler3D tDetail;
uniform vec3 uAmbTop;
uniform vec3 uAmbBottom;
uniform vec3 uFogCol;
uniform float uHorizon;
uniform float uHorizonMix;
uniform float uExposure;
uniform float uSteps;
uniform vec3 uCamPos;
uniform vec3 uCloudSun;
uniform vec3 uSunDiscCol;

const float PI = 3.14159265359;
const float RP = 6360e3;
const float RA = 6460e3;
const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const vec3 BM = vec3(21e-6);
const vec3 BO = vec3(0.65e-6, 1.881e-6, 0.085e-6);
const float HR = 8000.0;
const float HM = 1200.0;

vec2 sphere(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
// analytic air mass toward the light (Kasten-Young), as in the reference engine
vec3 transmittance(vec3 p, vec3 l) {
  float alt = length(p) - RP;
  if (sphere(p, l, RP - 100.0).x > 0.0) return vec3(0.0);
  float c = clamp(dot(normalize(p), l), -1.0, 1.0);
  float am = 1.0 / (max(c, 0.0) + 0.015 * pow(93.885 - acos(max(c, 0.0)) * 57.29578, -1.253));
  vec3 od = (BR * exp(-max(alt, 0.0) / HR) * HR + BM * exp(-max(alt, 0.0) / HM) * HM + BO * max(0.0, 1.0 - abs(alt - 25000.0) / 15000.0) * 15000.0) * am;
  return exp(-od);
}
vec3 atmosphere(vec3 ro, vec3 rd, out vec3 T) {
  T = vec3(1.0);
  vec2 at = sphere(ro, rd, RA);
  if (at.y < 0.0) return vec3(0.0);
  float t0 = max(0.0, at.x);
  float t1 = at.y;
  vec2 pl = sphere(ro, rd, RP);
  if (pl.x > 0.0) t1 = min(t1, pl.x);
  const int N = 16;
  float dt = (t1 - t0) / float(N);
  float c = dot(rd, uSunDir);
  float phR = 3.0 / (16.0 * PI) * (1.0 + c * c);
  float g = 0.76;
  float phM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + c * c)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * c, 1.5));
  vec3 S = vec3(0.0);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (t0 + dt * (float(i) + 0.5));
    float h = max(0.0, length(p) - RP);
    float dR = exp(-h / HR);
    float dM = exp(-h / HM);
    float dO = max(0.0, 1.0 - abs(h - 25000.0) / 15000.0);
    vec3 ext = BR * dR + BM * dM * 1.1 + BO * dO;
    S += (BR * dR * phR + BM * dM * phM) * transmittance(p, uSunDir) * T * dt;
    T *= exp(-ext * dt);
  }
  return S * uSunPower;
}
float hg(float g, float c) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * c, 1.5));
}
float remap(float v, float a, float b, float c, float d) { return c + (v - a) * (d - c) / (b - a); }
float cloudDensity(vec3 p, bool detail) {
  float h = (p.y - uBase) / (uTop - uBase);
  if (h < 0.0 || h > 1.0) return 0.0;
  // weather: large-scale coverage drifting with the wind (one slice of the base noise, ~45 km across)
  float weather = texture(tBase, vec3(p.xz / 45000.0 + uWind.xz * 0.15, 0.37)).g;
  float cov = clamp(uCoverage * (0.55 + 0.9 * (weather - 0.35)), 0.0, 1.0);
  if (cov < 0.01) return 0.0;
  // rounded bases, tops that rise where coverage is high (fair-weather cumulus to stratocumulus)
  float shape = smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.35 + cov * 0.55, 1.0, h));
  vec3 q = p / 5200.0 + uWind;
  float base = texture(tBase, q).r;
  float d = remap(base * shape, 1.0 - cov, 1.0, 0.0, 1.0);
  if (d <= 0.0) return 0.0;
  if (detail) {
    float e = texture(tDetail, q * 4.3 + uWind * 2.0).r;
    d = remap(d, e * 0.32 * (1.0 - h * 0.5), 1.0, 0.0, 1.0);
  }
  return clamp(d, 0.0, 1.0) * uDensity;
}
// clouds along a ray from world-space ro: returns scattered light (rgb) and opacity (a)
vec4 clouds(vec3 ro, vec3 rd, vec3 sunCol, float jitter, out float dist) {
  dist = 0.0;
  if (rd.y < 0.015) return vec4(0.0);
  float t0 = max(0.0, (uBase - ro.y) / rd.y);
  float t1 = (uTop - ro.y) / rd.y;
  t1 = min(t1, t0 + 14000.0);
  if (t0 > 52000.0 || t1 <= t0) return vec4(0.0);
  float steps = uSteps;
  float dt = (t1 - t0) / steps;
  float t = t0 + dt * jitter;
  float c = dot(rd, uSunDir);
  float phase = mix(hg(0.62, c), hg(-0.22, c), 0.3) * 4.0 * PI;
  vec3 S = vec3(0.0);
  float T = 1.0;
  float wd = 0.0;
  float ws = 0.0;
  const float EXT = 0.035;
  for (int i = 0; i < 64; i++) {
    if (float(i) >= steps || T < 0.02) break;
    vec3 p = ro + rd * t;
    float d = cloudDensity(p, true);
    if (d > 0.003) {
      // three samples toward the sun; the long one catches the deep self-shadow of a low evening sun
      float l1 = cloudDensity(p + uSunDir * 110.0, false);
      float l2 = cloudDensity(p + uSunDir * 420.0, false);
      float l3 = cloudDensity(p + uSunDir * 1300.0, false);
      float od = (l1 * 110.0 + l2 * 310.0 + l3 * 880.0) * EXT;
      float beer = exp(-od);
      float powder = 1.0 - exp(-od * 2.0);
      float h = (p.y - uBase) / (uTop - uBase);
      vec3 amb = mix(uAmbBottom, uAmbTop, h) * (0.55 + 0.45 * exp(-d * 1.5));
      vec3 L = sunCol * beer * mix(1.0, powder * 1.8, 0.45) * phase + amb;
      float a = 1.0 - exp(-d * EXT * dt);
      S += T * a * L;
      wd += t * T * a;
      ws += T * a;
      T *= 1.0 - a;
    }
    t += dt;
  }
  dist = ws > 0.0 ? wd / ws : t0;
  return vec4(S, 1.0 - T);
}
float sunDisc(vec3 rd) {
  float c = dot(rd, uSunDir);
  return smoothstep(0.99985, 0.99995, c) + pow(max(c, 0.0), 1800.0) * 0.04;
}
// full sky colour for a view direction (jitter 0..1 offsets the cloud march), in scene radiance units:
// the atmosphere is scaled by the calibrated exposure, clouds are lit by the scene's own sun and sky light
vec3 skyColor(vec3 rd, float jitter) {
  vec3 ro = vec3(0.0, RP + uAltitude + max(uCamPos.y, 0.0), 0.0);
  vec3 rdA = normalize(vec3(rd.x, max(rd.y, 0.004), rd.z));
  vec3 T;
  vec3 sky = atmosphere(ro, rdA, T) * uExposure;
  sky += sunDisc(rd) * uSunDiscCol * T;
  float cd;
  vec4 cl = clouds(uCamPos, rd, uCloudSun, jitter, cd);
  // aerial perspective on distant clouds
  float haze = 1.0 - exp(-cd / 26000.0);
  vec3 cloudCol = mix(cl.rgb, sky * cl.a, haze);
  vec3 col = sky * (1.0 - cl.a) + cloudCol;
  // the lowest band melts into the valley haze so the terrain fog meets the sky without a seam
  col = mix(col, uFogCol, uHorizonMix * (1.0 - smoothstep(-0.03, uHorizon, rd.y)));
  return col;
}`;

const skyScreenFrag = /* glsl */ `
${skyCommon}
varying vec2 vUv;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform mat4 uPrevVP;
uniform sampler2D tHistory;
uniform float uBlend;
uniform float uFrame;
uniform vec2 uRes;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec4 clip = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec4 v = uInvProj * clip;
  vec3 rd = normalize((uInvView * vec4(v.xyz / v.w, 0.0)).xyz);
  float jitter = fract(ign(gl_FragCoord.xy) + uFrame * 0.618034);
  vec3 col = skyColor(rd, jitter);
  // temporal reprojection: the sky is at infinity, so only the view rotation matters
  vec4 pc = uPrevVP * vec4(uCamPos + rd * 1.0e5, 1.0);
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  if (uBlend > 0.0 && pc.w > 0.0 && puv.x > 0.0 && puv.y > 0.0 && puv.x < 1.0 && puv.y < 1.0) {
    vec3 h = texture(tHistory, puv).rgb;
    col = mix(col, h, uBlend);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const skyDomeVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
}`;

const skyDomeFrag = /* glsl */ `
${skyCommon}
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(skyColor(normalize(vDir), 0.5), 1.0);
}`;

// ------------------------------------------------------------------ CPU twin (sun colour, ambient, calibration)
const RP = 6360e3;
const RA = 6460e3;
const BR = [5.8e-6, 13.5e-6, 33.1e-6];
const BM = 21e-6;
const BO = [0.65e-6, 1.881e-6, 0.085e-6];

function sphereHit(ro: number[], rd: number[], r: number): [number, number] {
  const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2];
  const c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r;
  const h = b * b - c;
  if (h < 0) return [-1, -1];
  const s = Math.sqrt(h);
  return [-b - s, -b + s];
}
function transmittanceCPU(p: number[], l: number[]): number[] {
  const len = Math.hypot(p[0], p[1], p[2]);
  const alt = len - RP;
  if (sphereHit(p, l, RP - 100)[0] > 0) return [0, 0, 0];
  const c = Math.max(-1, Math.min(1, (p[0] * l[0] + p[1] * l[1] + p[2] * l[2]) / len));
  const am = 1 / (Math.max(c, 0) + 0.015 * Math.pow(93.885 - Math.acos(Math.max(c, 0)) * 57.29578, -1.253));
  const a = Math.max(alt, 0);
  return [0, 1, 2].map((k) => Math.exp(-(BR[k] * Math.exp(-a / 8000) * 8000 + BM * Math.exp(-a / 1200) * 1200 + BO[k] * Math.max(0, 1 - Math.abs(alt - 25000) / 15000) * 15000) * am));
}
function atmosphereCPU(ro: number[], rd: number[], sun: number[], power: number): number[] {
  const at = sphereHit(ro, rd, RA);
  if (at[1] < 0) return [0, 0, 0];
  const t0 = Math.max(0, at[0]);
  let t1 = at[1];
  const pl = sphereHit(ro, rd, RP);
  if (pl[0] > 0) t1 = Math.min(t1, pl[0]);
  const N = 16;
  const dt = (t1 - t0) / N;
  const c = rd[0] * sun[0] + rd[1] * sun[1] + rd[2] * sun[2];
  const phR = (3 / (16 * Math.PI)) * (1 + c * c);
  const g = 0.76;
  const phM = ((3 / (8 * Math.PI)) * ((1 - g * g) * (1 + c * c))) / ((2 + g * g) * Math.pow(1 + g * g - 2 * g * c, 1.5));
  const S = [0, 0, 0];
  const T = [1, 1, 1];
  for (let i = 0; i < N; i++) {
    const t = t0 + dt * (i + 0.5);
    const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
    const h = Math.max(0, Math.hypot(p[0], p[1], p[2]) - RP);
    const dR = Math.exp(-h / 8000);
    const dM = Math.exp(-h / 1200);
    const dO = Math.max(0, 1 - Math.abs(h - 25000) / 15000);
    const tr = transmittanceCPU(p, sun);
    for (let k = 0; k < 3; k++) {
      S[k] += (BR[k] * dR * phR + BM * dM * phM) * tr[k] * T[k] * dt;
      T[k] *= Math.exp(-(BR[k] * dR + BM * dM * 1.1 + BO[k] * dO) * dt);
    }
  }
  return S.map((v) => v * power);
}

const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export class PhysicalSky {
  readonly uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunPower: { value: 20 },
    uAltitude: { value: 650 },
    uCoverage: { value: 0.45 },
    uDensity: { value: 1 },
    uBase: { value: 1800 },
    uTop: { value: 3600 },
    uWind: { value: new THREE.Vector3() },
    tBase: { value: null as THREE.Texture | null },
    tDetail: { value: null as THREE.Texture | null },
    uAmbTop: { value: new THREE.Color() },
    uAmbBottom: { value: new THREE.Color() },
    uFogCol: { value: new THREE.Color() },
    uHorizon: { value: 0.1 },
    uHorizonMix: { value: 0.5 },
    uExposure: { value: 1 },
    uSteps: { value: 40 },
    uCamPos: { value: new THREE.Vector3() },
    uCloudSun: { value: new THREE.Color() },
    uSunDiscCol: { value: new THREE.Color() },
    uInvProj: { value: new THREE.Matrix4() },
    uInvView: { value: new THREE.Matrix4() },
    uPrevVP: { value: new THREE.Matrix4() },
    tHistory: { value: null as THREE.Texture | null },
    uBlend: { value: 0 },
    uFrame: { value: 0 },
    uRes: { value: new THREE.Vector2() },
  };
  /** Cloud drift speed multiplier (1 = a gentle breeze aloft). */
  windSpeed = 1;
  /** Linear sun colour at the ground (transmittance × power, normalised to the noon value). */
  readonly sunColor = new THREE.Color(1, 1, 1);
  /** Sky light from above and the horizon, for the hemisphere light. */
  readonly skyTop = new THREE.Color();
  readonly skyHorizon = new THREE.Color();
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private screenMat: THREE.ShaderMaterial;
  private domeScene = new THREE.Scene();
  private domeMat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator;
  private env: THREE.WebGLRenderTarget | null = null;
  private prevVP = new THREE.Matrix4();
  private frame = 0;
  private envDirty = true;
  /** Seconds since the environment map was baked, and the sun direction it was baked for. */
  private envAge = 0;
  private envSun = new THREE.Vector3();
  private lastCover = -1;
  private lastBase = -1;
  private scale = 0.5;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    quality: 'low' | 'medium' | 'high',
  ) {
    this.scale = quality === 'high' ? 0.5 : 0.4;
    this.uniforms.uSteps.value = quality === 'low' ? 18 : quality === 'medium' ? 26 : 34;
    this.bakeNoise();
    const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(4, 4, rtOpts);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, rtOpts);
    this.screenMat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: skyScreenFrag, uniforms: this.uniforms, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.screenMat);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
    this.domeMat = new THREE.ShaderMaterial({ vertexShader: skyDomeVert, fragmentShader: skyDomeFrag, uniforms: { ...this.uniforms, uSteps: { value: 24 } }, side: THREE.BackSide, depthWrite: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.domeMat);
    dome.scale.setScalar(500);
    this.domeScene.add(dome);
    this.pmrem = new THREE.PMREMGenerator(renderer);
  }

  /** Bakes the tileable 3D cloud noises on the GPU, one slice at a time into 3D render targets. */
  private bakeNoise() {
    const r = this.renderer;
    const mat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: noiseFrag, uniforms: { uSlice: { value: 0 }, uMode: { value: 0 } }, depthTest: false, depthWrite: false });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);
    const make = (size: number, mode: number) => {
      const rt = new THREE.WebGL3DRenderTarget(size, size, size, { type: THREE.UnsignedByteType, depthBuffer: false });
      const t = rt.texture;
      t.format = THREE.RGBAFormat;
      t.minFilter = t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
      mat.uniforms.uMode.value = mode;
      for (let z = 0; z < size; z++) {
        mat.uniforms.uSlice.value = (z + 0.5) / size;
        r.setRenderTarget(rt, z);
        r.render(scene, this.quadCam);
      }
      return t;
    };
    this.uniforms.tBase.value = make(BAKE_BASE, 0);
    this.uniforms.tDetail.value = make(BAKE_DETAIL, 1);
    r.setRenderTarget(null);
    mat.dispose();
    quad.geometry.dispose();
  }

  /**
   * Sets sun direction, clouds and the horizon blend. Recomputes the sun colour and sky light on the CPU
   * twin of the shader, and the exposure that keeps a clear noon horizon near the old HDRI brightness.
   */
  set(sunDir: THREE.Vector3, clouds: CloudSettings, fogColor: THREE.Color, horizon: number, horizonMix: number, brightness: number, sunIntensity: number) {
    const u = this.uniforms;
    u.uSunDir.value.copy(sunDir).normalize();
    u.uCoverage.value = clouds.coverage;
    u.uDensity.value = clouds.density;
    u.uBase.value = clouds.base;
    u.uTop.value = clouds.top;
    u.uFogCol.value.copy(fogColor);
    u.uHorizon.value = horizon;
    u.uHorizonMix.value = horizonMix;
    const ro = [0, RP + u.uAltitude.value, 0];
    const sun = [sunDir.x, sunDir.y, sunDir.z];
    const power = u.uSunPower.value;
    // calibrate against a reference noon so dusk and golden hour stay naturally darker
    const refSun = [0.6, 0.8, 0];
    const refHorizon = atmosphereCPU(ro, [0.995, 0.1, 0], refSun, power);
    const exposure = (0.95 / Math.max(1e-4, lum(refHorizon))) * brightness;
    u.uExposure.value = exposure;
    const tr = transmittanceCPU(ro, sun);
    const trRef = transmittanceCPU(ro, refSun);
    this.sunColor.setRGB(tr[0] / trRef[0], tr[1] / trRef[1], tr[2] / trRef[2]);
    const zen = atmosphereCPU(ro, [0, 1, 0], sun, power).map((v) => v * exposure);
    const hz: number[] = [0, 0, 0];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = atmosphereCPU(ro, [Math.cos(a) * 0.99, 0.12, Math.sin(a) * 0.99], sun, power);
      for (let k = 0; k < 3; k++) hz[k] += (c[k] * exposure) / 6;
    }
    this.skyTop.setRGB(zen[0], zen[1], zen[2]);
    this.skyHorizon.setRGB(hz[0], hz[1], hz[2]);
    // clouds are lit in scene units: the sun as the directional light sees it (irradiance / pi, a white
    // cloud ~ a white wall in sun), plus sky light from above and a dimmer bounce from the valley below
    const trCloud = transmittanceCPU([0, RP + u.uAltitude.value + (clouds.base + clouds.top) / 2, 0], sun);
    const k = (sunIntensity / Math.PI) * 1.15;
    u.uCloudSun.value.setRGB((trCloud[0] / trRef[0]) * k, (trCloud[1] / trRef[1]) * k, (trCloud[2] / trRef[2]) * k);
    const zl = lum(zen);
    const hl = lum(hz);
    u.uAmbTop.value.setRGB(zen[0] * 0.75 + zl * 0.45, zen[1] * 0.75 + zl * 0.45, zen[2] * 0.75 + zl * 0.45);
    u.uAmbBottom.value.setRGB((hz[0] * 0.5 + hl * 0.5) * 0.5, (hz[1] * 0.5 + hl * 0.5) * 0.5, (hz[2] * 0.5 + hl * 0.5) * 0.5);
    u.uSunDiscCol.value.setRGB((tr[0] / trRef[0]) * 40, (tr[1] / trRef[1]) * 40, (tr[2] / trRef[2]) * 40);
    // overcast skies hide the sun: dim the ground sun colour by the cloud cover overhead
    const shade = 1 - Math.max(0, clouds.coverage - 0.55) * 1.6;
    this.sunColor.multiplyScalar(Math.max(0.15, shade));
    // only a new cloud deck drops the temporal history (a moving sun keeps it, so the sky doesn't sparkle)
    // (weather drifting in changes the deck a hair every frame: that is not a new deck)
    const jump = Math.abs(clouds.coverage - this.lastCover) > 0.04 || Math.abs(clouds.base - this.lastBase) > 150;
    this.lastCover = clouds.coverage;
    this.lastBase = clouds.base;
    if (jump) {
      u.uBlend.value = 0;
      this.envAge = Infinity;
    }
    // a big jump of the sun re-lights reflections at once; a slowly moving one at most about once a second
    if (this.envSun.angleTo(u.uSunDir.value) > 0.05) this.envAge = Infinity;
    this.envDirty = true;
  }

  setSize(w: number, h: number) {
    const sw = Math.max(64, Math.round(w * this.scale));
    const sh = Math.max(36, Math.round(h * this.scale));
    this.rtA.setSize(sw, sh);
    this.rtB.setSize(sw, sh);
    this.uniforms.uRes.value.set(sw, sh);
    this.uniforms.uBlend.value = 0;
  }

  /** Renders the sky for this camera into the background; refreshes the environment map when needed. */
  render(camera: THREE.PerspectiveCamera, dt: number) {
    const r = this.renderer;
    const u = this.uniforms;
    u.uWind.value.x += dt * 0.0016 * this.windSpeed;
    u.uWind.value.z += dt * 0.0007 * this.windSpeed;
    u.uCamPos.value.copy(camera.position);
    camera.updateMatrixWorld();
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uInvView.value.copy(camera.matrixWorld);
    u.uPrevVP.value.copy(this.prevVP);
    u.uFrame.value = this.frame++ % 1024;
    u.tHistory.value = this.rtB.texture;
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.rtA);
    r.render(this.quadScene, this.quadCam);
    r.setRenderTarget(prev);
    this.prevVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const t = this.rtA;
    this.rtA = this.rtB;
    this.rtB = t;
    this.scene.background = this.rtB.texture;
    // after the first frame, blend with history (clouds drift slowly; jitter converges in a few frames)
    u.uBlend.value = 0.86;
    this.envAge += dt;
    if (this.envDirty && this.envAge >= 1) this.updateEnvironment();
  }

  private updateEnvironment() {
    this.envDirty = false;
    this.envAge = 0;
    this.envSun.copy(this.uniforms.uSunDir.value);
    this.domeMat.uniforms.uSteps.value = 24;
    const prev = this.env;
    this.env = this.pmrem.fromScene(this.domeScene as unknown as THREE.Scene, 0, 0.1, 1000);
    this.scene.environment = this.env.texture;
    this.scene.environmentRotation.set(0, 0, 0);
    prev?.dispose();
  }
}

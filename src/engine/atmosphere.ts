import * as THREE from 'three';
import { Rng } from '../world/core/rng';
import { heightAt, forestDensity, valley, river, LAKE, MAP_RADIUS } from '../world/terrain';

/** Shared uniforms injected into every scene material (height fog with sun in-scattering). */
export const fogUniforms = {
  uFogHF: { value: 0.012 },
  uFogBase: { value: 0 },
  uFogHaze: { value: 0.00004 },
  uFogMax: { value: 0.92 },
  uSunDir: { value: new THREE.Vector3(0.5, 0.4, 0.5).normalize() },
  uSunCol: { value: new THREE.Color(0xffe2c0) },
  uInscatter: { value: 0.35 },
};

const patched = new WeakSet<THREE.Material>();

/**
 * Replaces three's distance fog with analytic exponential height fog (thick in the valley, thin on
 * the peaks) plus sun-direction in-scattering. Chains any existing onBeforeCompile.
 */
export function applyAtmosphere(mat: THREE.Material) {
  if (patched.has(mat) || !(mat as THREE.MeshStandardMaterial).fog) return;
  patched.add(mat);
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    Object.assign(shader.uniforms, fogUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\nvarying vec3 vAtmoWorld;')
      .replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vec4 atmoW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          atmoW = instanceMatrix * atmoW;
        #endif
        vAtmoWorld = (modelMatrix * atmoW).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <fog_pars_fragment>',
        `#include <fog_pars_fragment>
        varying vec3 vAtmoWorld;
        uniform float uFogHF; uniform float uFogBase; uniform float uFogHaze; uniform float uFogMax;
        uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uInscatter;`,
      )
      .replace(
        '#include <fog_fragment>',
        `#ifdef USE_FOG
          vec3 atmoRay = vAtmoWorld - cameraPosition;
          float atmoDist = length(atmoRay);
          vec3 atmoDir = atmoRay / max(atmoDist, 1e-3);
          #ifdef FOG_EXP2
            float atmoD = fogDensity;
          #else
            float atmoD = 0.001;
          #endif
          float a0 = atmoD * exp(-uFogHF * (cameraPosition.y - uFogBase));
          float ry = atmoDir.y * uFogHF * atmoDist;
          float hf = a0 * atmoDist * (abs(ry) > 1e-4 ? (1.0 - exp(-ry)) / ry : 1.0);
          float atmoAmt = clamp(1.0 - exp(-(hf + uFogHaze * atmoDist)), 0.0, uFogMax);
          float sunAmt = pow(max(dot(atmoDir, uSunDir), 0.0), 7.0) * uInscatter;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, uSunCol, sunAmt), atmoAmt);
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|atmo';
  mat.needsUpdate = true;
}

export function applyAtmosphereTo(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (!m) return;
    for (const mm of Array.isArray(m) ? m : [m]) applyAtmosphere(mm);
  });
}

// ------------------------------------------------------------------ mist banks
function mistTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rng = new Rng(51);
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = W / 2 + rng.range(-W * 0.32, W * 0.32);
    const y = H / 2 + rng.range(-H * 0.18, H * 0.18);
    const r = rng.range(18, 46);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = rng.range(0.05, 0.13);
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // soft overall falloff so cards never show edges
  const img = g.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      const f = Math.max(0, 1 - (dx * dx + dy * dy * 1.4));
      const o = (y * W + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.min(255, img.data[o] * f * f * 1.6);
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Instanced camera-facing mist cards drifting over forested slopes, the river and the lake. */
export class Mist {
  readonly mesh: THREE.InstancedMesh;
  readonly uniforms = {
    map: { value: null as THREE.Texture | null },
    uColor: { value: new THREE.Color(0xc8d2d4) },
    uOpacity: { value: 0.55 },
    uTime: { value: 0 },
  };

  constructor(count = 520) {
    this.uniforms.map.value = mistTexture();
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vec3 c = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float s = length(instanceMatrix[0].xyz);
          c.x += sin(uTime * 0.04 + c.z * 0.013) * 9.0;
          c.z += cos(uTime * 0.03 + c.x * 0.011) * 6.0;
          vec4 mv = viewMatrix * vec4(c, 1.0);
          mv.xy += position.xy * vec2(s, s * 0.42);
          vUv = uv;
          float d = -mv.z;
          // cards are only convincing seen edge-on; fade them when looked down on from above
          vec3 toCard = c - cameraPosition;
          float steep = abs(toCard.y) / max(length(toCard), 1.0);
          vFade = smoothstep(35.0, 160.0, d) * (1.0 - smoothstep(1700.0, 2800.0, d)) * (1.0 - smoothstep(0.18, 0.42, steep));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          float a = texture2D(map, vUv).r * uOpacity * vFade;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    mat.name = 'mist';
    const geo = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.name = 'mist';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    const rng = new Rng(3131);
    const m = new THREE.Matrix4();
    let n = 0;
    let guard = 0;
    while (n < count && guard++ < count * 40) {
      const kind = rng.next();
      let x: number;
      let z: number;
      let y: number;
      let s: number;
      if (kind < 0.6) {
        // forested slopes: banks clinging to the trees
        x = rng.range(-MAP_RADIUS, MAP_RADIUS);
        z = rng.range(-MAP_RADIUS, MAP_RADIUS);
        const v = valley(x, z);
        if (v.e < 15 || v.e > 700 || forestDensity(x, z) < 0.35) continue;
        y = heightAt(x, z) + rng.range(10, 40);
        s = rng.range(110, 230);
      } else if (kind < 0.9) {
        // low mist along the river
        const p = river.pts[rng.int(0, river.pts.length - 1)];
        x = p.x + rng.range(-25, 25);
        z = p.z + rng.range(-25, 25);
        y = p.water + rng.range(3, 8);
        s = rng.range(55, 110);
      } else {
        // over the lake
        const a = rng.range(0, Math.PI * 2);
        const r = Math.sqrt(rng.next()) * 0.95;
        x = LAKE.x + Math.cos(a) * LAKE.rx * r;
        z = LAKE.z + Math.sin(a) * LAKE.rz * r;
        y = LAKE.level + rng.range(3, 9);
        s = rng.range(80, 150);
      }
      m.makeScale(s, s, s).setPosition(x, y, z);
      this.mesh.setMatrixAt(n++, m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(t: number) {
    this.uniforms.uTime.value = t;
  }
}

// ------------------------------------------------------------------ presets
export interface AtmoPreset {
  name: string;
  sun: { azimuth: number; elevation: number; intensity: number; tint: number };
  env: number;
  sky: { intensity: number; tint: number; horizon: number; horizonMix: number };
  hemi: number;
  fog: { color: number; density: number; falloff: number; haze: number; max: number; inscatter: number };
  mist: { opacity: number; color: number };
  grade: { saturation: number; contrast: number; lift: [number, number, number]; gain: [number, number, number]; split: number; shadowTint: number; highTint: number };
  wet: number;
  windows: number;
  bloom: number;
  exposure: number;
  grain: number;
}

export const PRESETS: AtmoPreset[] = [
  {
    name: 'PNW Mist',
    sun: { azimuth: 236, elevation: 26, intensity: 2.0, tint: 0xffe9d2 },
    env: 0.72,
    sky: { intensity: 0.95, tint: 0xe6edf0, horizon: 0.16, horizonMix: 0.85 },
    hemi: 0.34,
    fog: { color: 0x9aa9ad, density: 0.0018, falloff: 0.011, haze: 0.00005, max: 0.9, inscatter: 0.4 },
    mist: { opacity: 0.42, color: 0xcfd8d8 },
    grade: { saturation: 0.86, contrast: 1.06, lift: [0.015, 0.03, 0.035], gain: [0.98, 1.0, 0.99], split: 0.6, shadowTint: 0x2f6f6a, highTint: 0xf2d9b0 },
    wet: 0.55,
    windows: 0.12,
    bloom: 0.42,
    exposure: 1.0,
    grain: 0.05,
  },
  {
    name: 'Overcast Drizzle',
    sun: { azimuth: 220, elevation: 34, intensity: 1.15, tint: 0xe6ecf2 },
    env: 0.9,
    sky: { intensity: 0.78, tint: 0xd5dde2, horizon: 0.24, horizonMix: 0.95 },
    hemi: 0.45,
    fog: { color: 0x8b979c, density: 0.0028, falloff: 0.009, haze: 0.00008, max: 0.94, inscatter: 0.15 },
    mist: { opacity: 0.6, color: 0xc2cacc },
    grade: { saturation: 0.72, contrast: 1.04, lift: [0.025, 0.035, 0.04], gain: [0.96, 0.99, 1.0], split: 0.5, shadowTint: 0x2c5c63, highTint: 0xdfe3e2 },
    wet: 0.95,
    windows: 0.35,
    bloom: 0.35,
    exposure: 1.05,
    grain: 0.07,
  },
  {
    name: 'Golden Hour',
    sun: { azimuth: 252, elevation: 7, intensity: 2.6, tint: 0xffb575 },
    env: 0.6,
    sky: { intensity: 1.0, tint: 0xffe6cc, horizon: 0.12, horizonMix: 0.7 },
    hemi: 0.28,
    fog: { color: 0xc9a98a, density: 0.0012, falloff: 0.012, haze: 0.00004, max: 0.86, inscatter: 0.85 },
    mist: { opacity: 0.4, color: 0xf2d6b8 },
    grade: { saturation: 0.98, contrast: 1.08, lift: [0.02, 0.015, 0.01], gain: [1.02, 0.99, 0.95], split: 0.7, shadowTint: 0x2f4f6f, highTint: 0xffc98a },
    wet: 0.25,
    windows: 0.3,
    bloom: 0.55,
    exposure: 1.0,
    grain: 0.04,
  },
  {
    name: 'Dusk',
    sun: { azimuth: 258, elevation: 2.5, intensity: 0.5, tint: 0xff9a6a },
    env: 0.38,
    sky: { intensity: 0.42, tint: 0x9fb2cf, horizon: 0.2, horizonMix: 0.9 },
    hemi: 0.2,
    fog: { color: 0x3c4a5c, density: 0.0021, falloff: 0.01, haze: 0.00006, max: 0.93, inscatter: 0.55 },
    mist: { opacity: 0.45, color: 0x6f7f92 },
    grade: { saturation: 0.82, contrast: 1.1, lift: [0.0, 0.015, 0.035], gain: [0.95, 0.98, 1.05], split: 0.7, shadowTint: 0x1f3f5f, highTint: 0xffc890 },
    wet: 0.7,
    windows: 1.0,
    bloom: 0.75,
    exposure: 1.35,
    grain: 0.06,
  },
  {
    name: 'Clear Day',
    sun: { azimuth: 246, elevation: 39, intensity: 3.1, tint: 0xfff1dc },
    env: 0.62,
    sky: { intensity: 1.08, tint: 0xffffff, horizon: 0.08, horizonMix: 0.3 },
    hemi: 0.28,
    fog: { color: 0xa9afc0, density: 0.0006, falloff: 0.006, haze: 0.00003, max: 0.8, inscatter: 0.25 },
    mist: { opacity: 0.0, color: 0xdde3e6 },
    grade: { saturation: 1.03, contrast: 1.05, lift: [0, 0, 0], gain: [1, 1, 1], split: 0, shadowTint: 0x808080, highTint: 0x808080 },
    wet: 0,
    windows: 0,
    bloom: 0.42,
    exposure: 1.0,
    grain: 0,
  },
];

import * as THREE from 'three';

const MAX = 900;

/**
 * Small pooled particle system for everything a car throws up: water spray and splashes, dust off gravel
 * and grass, tyre smoke. One draw call; particles are soft round sprites that grow and fade as they age.
 */
export class Spray {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 4);
  private size = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private age = new Float32Array(MAX).fill(1e9);
  private life = new Float32Array(MAX).fill(1);
  private alpha = new Float32Array(MAX);
  private size0 = new Float32Array(MAX);
  private grow = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private next = 0;
  private live = 0;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uScale: { value: 600 }, uLight: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: /* glsl */ `
        attribute vec4 aColor;
        attribute float aSize;
        uniform float uScale;
        varying vec4 vColor;
        void main() {
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(0.5, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLight;
        varying vec4 vColor;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float a = smoothstep(1.0, 0.25, length(p)) * vColor.a;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vColor.rgb * uLight * (0.85 + 0.15 * (0.5 - p.y)), a);
        }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    this.points.name = 'spray';
    this.points.visible = false;
  }

  /** Tint by the scene's light so spray does not glow at night; `height` is the drawing-buffer height. */
  setLight(color: THREE.Color, intensity: number, height: number, fovDeg: number) {
    const u = (this.points.material as THREE.ShaderMaterial).uniforms;
    (u.uLight.value as THREE.Color).copy(color).multiplyScalar(Math.min(1.15, 0.08 + intensity));
    u.uScale.value = height / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, rgb: number, alpha: number, grow = 1.5, gravity = 9.8) {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.age[i] = 0;
    this.life[i] = life;
    this.alpha[i] = alpha;
    this.size0[i] = size;
    this.grow[i] = grow;
    this.grav[i] = gravity;
    this.col[i * 4] = ((rgb >> 16) & 255) / 255;
    this.col[i * 4 + 1] = ((rgb >> 8) & 255) / 255;
    this.col[i * 4 + 2] = (rgb & 255) / 255;
    this.live = Math.max(this.live, life);
  }

  update(dt: number) {
    this.live -= dt;
    if (this.live < -0.2) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;
    for (let i = 0; i < MAX; i++) {
      const a = (this.age[i] += dt);
      const t = a / this.life[i];
      if (t >= 1) {
        this.col[i * 4 + 3] = 0;
        this.size[i] = 0;
        continue;
      }
      const drag = Math.exp(-1.6 * dt);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 2] *= drag;
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.col[i * 4 + 3] = this.alpha[i] * (1 - t) * Math.min(1, t * 12);
      this.size[i] = this.size0[i] * (1 + this.grow[i] * t);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

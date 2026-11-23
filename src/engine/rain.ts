import * as THREE from 'three';

const BOX = new THREE.Vector3(56, 36, 56);

/**
 * Falling rain as streaks in a box that travels with the camera. Each drop is two vertices; the vertex shader
 * moves them (fall, wind, wrap around the camera), so the CPU only sets a few uniforms a frame.
 */
export class Rain {
  readonly mesh: THREE.LineSegments;
  private uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uWind: { value: new THREE.Vector2() },
    uColor: { value: new THREE.Color(0.8, 0.84, 0.88) },
    uBox: { value: BOX },
  };

  constructor(count = 9000) {
    const seed = new Float32Array(count * 2 * 4);
    const end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const s = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let k = 0; k < 2; k++) {
        seed.set(s, (i * 2 + k) * 4);
        end[i * 2 + k] = k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        attribute float aEnd;
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uCam;
        uniform vec2 uWind;
        uniform vec3 uBox;
        varying float vA;
        void main() {
          float speed = 15.0 + 7.0 * fract(aSeed.x * 7.31 + aSeed.z * 3.17);
          vec3 vel = vec3(uWind.x, -speed, uWind.y);
          vec3 p = aSeed.xyz * uBox + vel * uTime;
          p = mod(p - uCam, uBox) - uBox * 0.5 + uCam;
          p -= normalize(vel) * aEnd * (0.55 + 0.5 * fract(aSeed.y * 13.7));
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float near = smoothstep(0.6, 3.5, -mv.z);
          float edge = smoothstep(uBox.x * 0.5, uBox.x * 0.32, length(p.xz - uCam.xz));
          vA = step(aSeed.w, uIntensity) * near * edge * (1.0 - aEnd * 0.85);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          if (vA < 0.01) discard;
          gl_FragColor = vec4(uColor, vA * 0.42);
        }`,
    });
    this.mesh = new THREE.LineSegments(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 19;
    this.mesh.visible = false;
    this.mesh.name = 'rain';
  }

  update(dt: number, camera: THREE.Camera, intensity: number, wind: THREE.Vector2, light: number) {
    this.mesh.visible = intensity > 0.01;
    if (!this.mesh.visible) return;
    const u = this.uniforms;
    u.uTime.value = (u.uTime.value + dt) % 900;
    u.uIntensity.value = intensity;
    u.uCam.value.copy(camera.position);
    u.uWind.value.copy(wind);
    const l = Math.min(1, 0.1 + light);
    u.uColor.value.setRGB(0.8 * l, 0.84 * l, 0.88 * l);
  }
}

/** Stars for clear nights: a dome of points that rides with the camera and fades with daylight and cloud. */
export class Stars {
  readonly points: THREE.Points;
  constructor(count = 1400, radius = 9000) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = 0.04 + Math.random() * 0.96;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius], i * 3);
      const b = 0.35 + 0.65 * Math.pow(Math.random(), 3);
      const warm = Math.random();
      col.set([b * (0.85 + 0.15 * warm), b * 0.92, b * (1 - 0.2 * warm)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.name = 'stars';
  }
  update(camera: THREE.Camera, amount: number) {
    const m = this.points.material as THREE.PointsMaterial;
    m.opacity = amount;
    this.points.visible = amount > 0.01;
    this.points.position.copy(camera.position);
  }
}

import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/** Equirect U of the sun disc in the Poly Haven "kloofendal_48d_partly_cloudy_puresky" HDRI. */
const HDRI_SUN_U = 0.5947;
const D2R = Math.PI / 180;

export type Quality = 'low' | 'medium' | 'high';

/**
 * Sun + sky: Poly Haven HDRI for background and image-based lighting, a directional sun aligned
 * with the HDRI's sun, exponential haze, and a camera-fitted, texel-snapped shadow frustum.
 */
export class SkyRig {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly dir = new THREE.Vector3();
  azimuth = 246; // compass bearing of the sun (0 = north/-Z, 90 = east/+X)
  elevation = 39;
  sunIntensity = 3.1;
  envIntensity = 0.62;
  skyIntensity = 1.08;
  exposure = 1.0;
  hazeDensity = 0.00014;
  shadowExtent = 0;
  private fog: THREE.FogExp2;
  /** Sky dome sampling the equirect directly (avoids the equirect→cube background conversion). */
  readonly dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private snapRight = new THREE.Vector3();
  private snapUp = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    quality: Quality,
  ) {
    this.sun = new THREE.DirectionalLight(0xfff1dc, this.sunIntensity);
    this.sun.castShadow = true;
    const size = quality === 'high' ? 4096 : quality === 'medium' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.045;
    this.sun.shadow.radius = 2.2;
    this.sun.shadow.intensity = 0.92;
    this.hemi = new THREE.HemisphereLight(0xd6e4f5, 0x6a6f4a, 0.28);
    this.fog = new THREE.FogExp2(0xa9afc0, this.hazeDensity);
    scene.fog = this.fog;
    const geo = new THREE.SphereGeometry(1, 96, 48);
    // match three's equirect lookup: u = atan2(dir.z, dir.x) / 2π + 0.5
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    this.dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
    this.dome.name = 'sky-dome';
    this.dome.renderOrder = -1000;
    this.dome.frustumCulled = false;
    this.dome.scale.setScalar(18000);
    this.dome.onBeforeRender = (_r, _s, cam) => {
      this.dome.position.copy(cam.position);
      this.dome.updateMatrixWorld();
    };
    scene.add(this.sun, this.sun.target, this.hemi, this.dome);
  }

  async load(base: string) {
    const hdr = await new HDRLoader().loadAsync(`${base}assets/sky/sky_ibl_1k.hdr`);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const bg = await new THREE.TextureLoader().loadAsync(`${base}assets/sky/sky_4k.jpg`);
    bg.colorSpace = THREE.SRGBColorSpace;
    bg.anisotropy = 4;
    this.scene.environment = hdr;
    this.scene.background = new THREE.Color(0xa9afc0);
    this.dome.material.map = bg;
    this.dome.material.needsUpdate = true;
    this.apply();
  }

  /** Re-applies angles and intensities (call after changing any public field). */
  apply() {
    const az = this.azimuth * D2R;
    const el = this.elevation * D2R;
    this.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    // Rotate the HDRI so its sun sits at the same compass bearing as the light.
    const hdriPhi = (HDRI_SUN_U - 0.5) * Math.PI * 2;
    const rot = hdriPhi - Math.atan2(this.dir.z, this.dir.x);
    this.dome.rotation.set(0, rot, 0);
    this.scene.environmentRotation.set(0, rot, 0);
    const e = this.exposure;
    // warmer, dimmer sun as it approaches the horizon
    const low = THREE.MathUtils.smoothstep(this.elevation, 4, 28);
    this.sun.color.setRGB(1, 0.86 + 0.1 * low, 0.72 + 0.2 * low);
    this.sun.intensity = this.sunIntensity * e * (0.35 + 0.65 * low);
    this.hemi.intensity = 0.28 * e;
    this.scene.environmentIntensity = this.envIntensity * e;
    this.dome.material.color.setScalar(this.skyIntensity * e);
    this.fog.density = this.hazeDensity;
    this.snapRight.crossVectors(new THREE.Vector3(0, 1, 0), this.dir).normalize();
    this.snapUp.crossVectors(this.dir, this.snapRight).normalize();
  }

  /** Fits the shadow frustum around `focus`, snapped to whole texels to avoid shimmering. */
  updateShadows(focus: THREE.Vector3, extent: number) {
    const s = this.sun.shadow;
    const cam = s.camera as THREE.OrthographicCamera;
    const ext = Math.round(extent / 4) * 4;
    const texel = (2 * ext) / s.mapSize.x;
    const fr = Math.round(focus.dot(this.snapRight) / texel) * texel;
    const fu = Math.round(focus.dot(this.snapUp) / texel) * texel;
    const fd = focus.dot(this.dir);
    const snapped = new THREE.Vector3().addScaledVector(this.snapRight, fr).addScaledVector(this.snapUp, fu).addScaledVector(this.dir, fd);
    this.sun.target.position.copy(snapped);
    this.sun.position.copy(snapped).addScaledVector(this.dir, 900);
    if (ext !== this.shadowExtent) {
      this.shadowExtent = ext;
      cam.left = -ext;
      cam.right = ext;
      cam.top = ext;
      cam.bottom = -ext;
      cam.near = 10;
      cam.far = 2000;
      cam.updateProjectionMatrix();
      s.normalBias = 0.03 + ext * 0.00035;
    }
    this.sun.target.updateMatrixWorld();
  }
}

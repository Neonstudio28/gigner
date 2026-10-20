import * as THREE from 'three';
import GUI from 'lil-gui';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { ToneMappingMode } from 'postprocessing';
import type { SkyRig } from './sky';
import type { PostFX } from './post';
import type { CameraDirector } from './controls';
import type { TownWorld } from '../world';
import { DRIVABLE, type DriveMode } from './drive';
import { PRESETS, type Mist } from './atmosphere';
import { surfaceUniforms } from '../world/materials';
import { fogUniforms } from './atmosphere';

export function createUI(o: {
  sky: SkyRig;
  post: PostFX;
  director: CameraDirector;
  world: TownWorld;
  renderer: THREE.WebGLRenderer;
  drive: DriveMode;
  driveState: { vehicle: string; color: string };
  enterDrive: () => void;
  exitDrive: () => void;
  mist: Mist;
  setPreset: (name: string) => void;
  preset: { name: string };
}) {
  const { sky, post, director, world, renderer, drive, driveState } = o;
  const gui = new GUI({ title: 'Pine Hollow' });
  gui.close();

  const cam = {
    shot: director.shots[0].id,
    tour: director.tour,
    fly: () => director.setMode(director.mode === 'fly' ? 'orbit' : 'fly'),
  };
  const fCam = gui.addFolder('Camera');
  fCam
    .add(cam, 'shot', Object.fromEntries(director.shots.map((s) => [s.name, s.id])))
    .name('Shot')
    .onChange((id: string) => director.goTo(director.shots.findIndex((s) => s.id === id)));
  fCam.add(cam, 'tour').name('Cinematic tour').onChange((v: boolean) => (director.tour = v)).listen();
  fCam.add(cam, 'fly').name('Toggle free-fly (F)');
  fCam.add(director, 'flySpeed', 4, 60, 1).name('Fly speed');
  director.onShotChange = (s) => {
    cam.shot = s.id;
    fCam.controllers[0].updateDisplay();
  };

  const fDrive = gui.addFolder('Drive');
  const dv = {
    toggle: () => (drive.active ? o.exitDrive() : o.enterDrive()),
    sound: true,
  };
  fDrive.add(dv, 'toggle').name('Enter / exit car (V)');
  fDrive
    .add(driveState, 'vehicle', DRIVABLE.map((d) => d.name))
    .name('Vehicle')
    .onChange((name: string) => {
      const d = DRIVABLE.find((v) => v.name === name);
      if (d) {
        driveState.color = '#' + new THREE.Color(d.color || 0x888888).getHexString();
        colorCtl.updateDisplay();
      }
      if (drive.active) {
        o.exitDrive();
        o.enterDrive();
      }
    });
  const colorCtl = fDrive.addColor(driveState, 'color').name('Paint');
  fDrive.add(drive, 'camMode', { Chase: 0, 'Far chase': 1, Cockpit: 2 }).name('Camera (C)').listen();
  fDrive.add(dv, 'sound').name('Engine sound').onChange((v: boolean) => drive.audio.setEnabled(v));
  fDrive.open();

  const fAtmo = gui.addFolder('Atmosphere');
  fAtmo
    .add(o.preset, 'name', PRESETS.map((p) => p.name))
    .name('Preset')
    .onChange((n: string) => {
      o.setPreset(n);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    });
  fAtmo.add(sky, 'hazeDensity', 0, 0.006, 0.0001).name('Valley fog').onChange(() => sky.apply());
  fAtmo.add(sky, 'fogFalloff', 0.002, 0.03, 0.0005).name('Fog height falloff').onChange(() => sky.apply());
  fAtmo.add(o.mist.uniforms.uOpacity, 'value', 0, 1.2, 0.01).name('Mist banks');
  fAtmo.add(surfaceUniforms.uWet, 'value', 0, 1, 0.01).name('Wet roads');
  fAtmo.add(surfaceUniforms.uWindowGlow, 'value', 0, 1.5, 0.01).name('Lit windows');
  fAtmo.add(fogUniforms.uInscatter, 'value', 0, 1.5, 0.01).name('Sun glow in fog');
  fAtmo.open();

  const fLight = gui.addFolder('Lighting');
  const apply = () => sky.apply();
  fLight.add(sky, 'azimuth', 0, 360, 1).name('Sun bearing °').onChange(apply);
  fLight.add(sky, 'elevation', 3, 80, 0.5).name('Sun elevation °').onChange(apply);
  fLight.add(sky, 'sunIntensity', 0, 8, 0.05).name('Sun').onChange(apply);
  fLight.add(sky, 'envIntensity', 0, 2, 0.01).name('Sky light (IBL)').onChange(apply);
  fLight.add(sky, 'skyIntensity', 0.2, 2, 0.01).name('Sky brightness').onChange(apply);
  fLight.add(sky, 'exposure', 0.3, 2, 0.01).name('Exposure').onChange(apply);

  const fPost = gui.addFolder('Post FX');
  fPost.add(post.ao, 'enabled').name('Ambient occlusion');
  fPost.add(post.ao.configuration, 'intensity', 0, 8, 0.1).name('AO intensity');
  fPost.add(post.ao.configuration, 'aoRadius', 0.5, 8, 0.1).name('AO radius');
  fPost.add(post.bloom, 'intensity', 0, 2, 0.01).name('Bloom');
  fPost.add(post.vignette, 'darkness', 0, 1, 0.01).name('Vignette');
  const tm = { mode: 'ACES' };
  const modes: Record<string, number> = { ACES: ToneMappingMode.ACES_FILMIC, AgX: ToneMappingMode.AGX, Neutral: ToneMappingMode.NEUTRAL, Reinhard: ToneMappingMode.REINHARD2 };
  fPost.add(tm, 'mode', Object.keys(modes)).name('Tone mapping').onChange((m: string) => (post.tone.mode = modes[m]));
  fPost.add(post.grade.u('uSat'), 'value', 0, 1.5, 0.01).name('Saturation');
  fPost.add(post.grade.u('uContrast'), 'value', 0.7, 1.4, 0.01).name('Contrast');
  fPost.add(post.grain.blendMode.opacity, 'value', 0, 0.3, 0.005).name('Film grain');

  const fWorld = gui.addFolder('World');
  fWorld.add(world.traffic, 'enabled').name('Traffic');
  fWorld.add(renderer.shadowMap, 'enabled').name('Shadows').onChange(() => scheduleMaterialsUpdate(world));
  const exp = {
    glb: () => exportGLB(world.root),
  };
  fWorld.add(exp, 'glb').name('Export world (.glb)');

  return gui;
}

function scheduleMaterialsUpdate(world: TownWorld) {
  world.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => (mat.needsUpdate = true));
  });
}

/** Exports the whole world (instanced trees via EXT_mesh_gpu_instancing) for Unity / Unreal / Godot / Blender. */
export async function exportGLB(root: THREE.Object3D) {
  const status = document.getElementById('toast');
  if (status) {
    status.textContent = 'Exporting GLB… this can take a moment';
    status.classList.add('show');
  }
  await new Promise((r) => setTimeout(r, 50));
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(root, { binary: true, onlyVisible: true });
  const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pine-hollow-lowpoly-town.glb';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  if (status) {
    status.textContent = `Exported ${(blob.size / 1048576).toFixed(1)} MB`;
    setTimeout(() => status.classList.remove('show'), 2500);
  }
}

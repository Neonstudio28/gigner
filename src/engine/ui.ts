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
import type { Weather, SkyKind } from './weather';
import { surfaceUniforms } from '../world/materials';
import { fogUniforms } from './atmosphere';
import type { VolumetricFogPass } from './volumetric';
import type { PhysicalSky } from './physicalSky';

const D2R = Math.PI / 180;
/** Pine Hollow's latitude (the Silver Valley, Idaho panhandle). */
const LATITUDE = 47.5;

/** Sun bearing (0 = north, 90 = east) and elevation (degrees) for a local solar time and season (declination). */
export function solarPosition(hours: number, declination: number) {
  const phi = LATITUDE * D2R;
  const dec = declination * D2R;
  const H = (hours - 12) * 15 * D2R;
  const sinEl = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const el = Math.asin(THREE.MathUtils.clamp(sinEl, -1, 1));
  const az = Math.atan2(-Math.sin(H) * Math.cos(dec), (Math.sin(dec) - sinEl * Math.sin(phi)) / Math.cos(phi));
  return { azimuth: (((az / D2R) % 360) + 360) % 360, elevation: el / D2R };
}

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
  fog: VolumetricFogPass;
  physical: PhysicalSky | null;
  weather: Weather;
}) {
  const { sky, post, director, world, renderer, drive, driveState, fog } = o;
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

  const fWeather = gui.addFolder('Weather & time');
  const front = { now: 'mist' };
  fWeather.add(o.weather, 'enabled').name('Dynamic (fronts + day/night)').listen();
  fWeather.add(o.weather, 'hour', 0, 24, 0.05).name('Clock (h)').listen();
  fWeather.add(o.weather, 'rate', 0, 30, 0.1).name('Game hours per minute');
  fWeather
    .add(front, 'now', ['clear', 'mist', 'overcast', 'rain', 'fog'])
    .name('Bring in a front')
    .onChange((k: SkyKind) => {
      o.weather.enabled = true;
      o.weather.set(k);
    });
  fWeather.open();

  const fAtmo = gui.addFolder('Atmosphere');
  fAtmo
    .add(o.preset, 'name', PRESETS.map((p) => p.name))
    .name('Preset')
    .onChange((n: string) => {
      o.setPreset(n);
      syncDay();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    });
  fAtmo.add(sky, 'hazeDensity', 0, 0.006, 0.0001).name('Valley fog').onChange(() => sky.apply());
  fAtmo.add(sky, 'fogFalloff', 0.002, 0.03, 0.0005).name('Fog height falloff').onChange(() => sky.apply());
  fAtmo.add(o.mist.uniforms.uOpacity, 'value', 0, 1.2, 0.01).name('Mist banks');
  fAtmo.add(surfaceUniforms.uWet, 'value', 0, 1, 0.01).name('Wet roads');
  fAtmo.add(surfaceUniforms.uWindowGlow, 'value', 0, 1.5, 0.01).name('Lit windows');
  fAtmo.add(fogUniforms.uInscatter, 'value', 0, 1.5, 0.01).name('Sun glow in fog');
  fAtmo.open();

  // raymarched valley fog: thickness, layer, drifting banks, light shafts and lamp glow
  const fs = fog.settings;
  const fVol = gui.addFolder('Volumetric fog');
  fVol
    .add(fs, 'enabled')
    .name('Volumetric fog')
    .onChange((v: boolean) => {
      fog.enabled = v;
      if (!v) fogUniforms.uFogStart.value = 0;
    })
    .listen();
  fVol.add(fs, 'density', 0, 0.08, 0.0005).name('Thickness').listen();
  fVol.add(fs, 'base', -20, 150, 1).name('Fog layer top (m)').listen();
  fVol.add(fs, 'falloff', 0.002, 0.08, 0.001).name('Thinning with height').listen();
  fVol.add(fs, 'noise', 0, 1, 0.01).name('Drifting banks').listen();
  fVol.add(fs, 'noiseScale', 60, 1500, 10).name('Bank size (m)');
  fVol.add(fs, 'windSpeed', 0, 20, 0.1).name('Wind (m/s)');
  fVol.add(fs, 'windDir', 0, 360, 1).name('Wind toward °');
  fVol.add(fs, 'sun', 0, 4, 0.01).name('Sunlight in fog').listen();
  fVol.add(fs, 'anisotropy', 0, 0.95, 0.01).name('Glare toward sun').listen();
  fVol.add(fs, 'penetration', 0, 1, 0.01).name('Sun through fog layer').listen();
  fVol.add(fs, 'ambient', 0, 2.5, 0.01).name('Sky light in fog').listen();
  fVol.add(fs, 'shafts', 0, 1, 0.01).name('Light shafts').listen();
  fVol.add(fs, 'lamps', 0, 4, 0.01).name('Lamp glow').listen();
  fVol.add(fog, 'lampsOn', 0, 1, 0.01).name('Street lamps on').listen();
  fVol.add(fs, 'range', 200, 3000, 10).name('Raymarch range (m)');
  fVol.add(fs, 'steps', 8, 64, 1).name('Quality (steps)');
  fVol.open();

  // physically based sky and volumetric cloud deck
  const fSky = gui.addFolder('Sky & clouds');
  const reSky = () => sky.apply();
  // the cloud deck only exists with the physically based sky (not with ?sky=hdri)
  if (o.physical) {
    fSky.add(sky.clouds, 'coverage', 0, 1, 0.01).name('Cloud cover').onChange(reSky).listen();
    fSky.add(sky.clouds, 'density', 0, 3, 0.01).name('Cloud density').onChange(reSky).listen();
    fSky.add(sky.clouds, 'base', 300, 5000, 10).name('Cloud base (m)').onChange(reSky).listen();
    fSky.add(sky.clouds, 'top', 600, 8000, 10).name('Cloud top (m)').onChange(reSky).listen();
    fSky.add(o.physical, 'windSpeed', 0, 20, 0.1).name('Cloud drift speed');
  }
  fSky.add(sky, 'horizon', 0, 0.6, 0.01).name('Horizon haze height').onChange(reSky).listen();
  fSky.add(sky, 'horizonMix', 0, 1, 0.01).name('Horizon haze').onChange(reSky).listen();

  // time of day: the sun follows its real arc over the Silver Valley
  const day = { time: 8.5, season: 'Equinox (Mar/Sep)', animate: false, speed: 2 };
  const seasons: Record<string, number> = { 'Midsummer (Jun)': 23.4, 'Late summer (Aug)': 13, 'Equinox (Mar/Sep)': 0, 'Late autumn (Nov)': -18, 'Midwinter (Dec)': -23.4 };
  const setTime = () => {
    const s = solarPosition(day.time, seasons[day.season]);
    sky.azimuth = s.azimuth;
    // below the horizon the sky rig holds a deep dusk; the lamps take over
    sky.elevation = Math.max(-3, s.elevation);
    const weather = Math.min(1, (PRESETS.find((p) => p.name === o.preset.name)?.windows ?? 0) * 1.3);
    fog.lampsOn = Math.max(weather, THREE.MathUtils.smoothstep(-s.elevation, -12, -2));
    sky.apply();
  };
  /** Sets the time and season that put the sun where the current preset has it (so animating starts from there). */
  const syncDay = () => {
    let best = Infinity;
    for (const season of Object.keys(seasons))
      for (let t = 4; t <= 22; t += 0.05) {
        const p = solarPosition(t, seasons[season]);
        const da = Math.abs(((p.azimuth - sky.azimuth + 540) % 360) - 180);
        const err = da * da + (p.elevation - sky.elevation) ** 2 * 4;
        if (err < best) {
          best = err;
          day.time = Math.round(t * 20) / 20;
          day.season = season;
        }
      }
  };
  syncDay();
  const fDay = gui.addFolder('Time of day');
  fDay.add(day, 'time', 4, 22, 0.05).name('Local time (h)').onChange(setTime).listen();
  fDay.add(day, 'season', Object.keys(seasons)).name('Season').onChange(setTime).listen();
  fDay.add(day, 'animate').name('Animate sun');
  fDay.add(day, 'speed', 0.1, 60, 0.1).name('Hours per minute');
  let since = 0;

  const fLight = gui.addFolder('Lighting');
  const apply = () => sky.apply();
  fLight.add(sky, 'azimuth', 0, 360, 1).name('Sun bearing °').onChange(apply).listen();
  fLight.add(sky, 'elevation', -3, 80, 0.5).name('Sun elevation °').onChange(apply).listen();
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

  return {
    gui,
    /** Advances the animated sun (re-lighting the sky a few times a second, not every frame). */
    update(dt: number) {
      if (!day.animate) return;
      day.time += (dt * day.speed) / 60;
      if (day.time > 22) day.time = 4;
      since += dt;
      if (since > 0.1) {
        since = 0;
        setTime();
      }
    },
  };
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

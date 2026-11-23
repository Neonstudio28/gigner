import * as THREE from 'three';
import { SkyRig, type Quality } from './sky';
import { PostFX, patchFlatShadingNaN } from './post';
import { CameraDirector } from './controls';
import { createUI } from './ui';
import { DriveMode, DRIVABLE } from './drive';
import { DriveHUD } from './hud';
import { createTownWorld } from '../world';
import { loadVehicleModels } from '../world/vehicles';
import { applyAtmosphereTo, Mist, PRESETS, type AtmoPreset } from './atmosphere';
import { PhysicalSky } from './physicalSky';
import { WaterFX } from './water';
import { Weather, type SkyKind } from './weather';
import { Rain, Stars } from './rain';
import { VolumetricFogPass } from './volumetric';
import { isWater } from '../world/terrain';
import { surfaceUniforms } from '../world/materials';

export interface AppHandle {
  ready: boolean;
  setShot: (id: string) => void;
  /** Render n frames then idle again (used by `?still=1` capture mode). */
  renderFrames: (n: number) => void;
  /** Enter the drivable car at a spot (scripted captures / game hooks). */
  drive: (type?: string, x?: number, z?: number, heading?: number) => void;
  /** Hold keys and simulate `seconds` of driving at 60 Hz without rendering. */
  simulate: (seconds: number, keys: string[], ghost?: boolean) => void;
  exitDrive: () => void;
  /** Place the orbit camera (captures / debugging). */
  look: (pos: [number, number, number], target: [number, number, number], fov?: number) => void;
  info: () => Record<string, number | string>;
  /** The weather and clock (scripts can set `hour`, `rate`, or call `set('rain', true)`). */
  weather: Weather;
}

declare global {
  interface Window {
    __town?: AppHandle;
  }
}

export async function startApp(container: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const quality = (params.get('quality') as Quality) ?? 'high';
  const showUI = params.get('ui') !== '0';
  // Capture mode for software-GL/headless screenshots: render a few frames, then stop the loop.
  const still = params.get('still') === '1';
  let framesLeft = still ? 4 : Infinity;
  const fill = document.getElementById('loader-fill') as HTMLElement;
  const label = document.getElementById('loader-status') as HTMLElement;
  const setProgress = (f: number, text: string) => {
    fill.style.width = `${Math.round(f * 100)}%`;
    label.textContent = text;
  };

  patchFlatShadingNaN();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
  const maxDpr = Math.min(window.devicePixelRatio, quality === 'high' ? 1.5 : 1);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the post stack
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.4, 21000);

  setProgress(0.01, 'Baking cloud noise and the atmosphere');
  const sky = new SkyRig(scene, quality);
  // physically based sky with volumetric clouds (?sky=hdri brings back the Poly Haven HDRI dome)
  const physical = params.get('sky') === 'hdri' ? null : new PhysicalSky(renderer, scene, quality);
  sky.physical = physical;
  await sky.load(import.meta.env.BASE_URL);

  await loadVehicleModels(import.meta.env.BASE_URL);
  const world = await createTownWorld({ traffic: params.get('traffic') !== '0', onProgress: (f, t) => setProgress(0.05 + f * 0.85, t) });
  scene.add(world.root);
  // dev-only handle for inspecting the generated town from the browser console
  if (import.meta.env.DEV) (window as unknown as { pineHollow: typeof world }).pineHollow = world;

  const director = new CameraDirector(camera, renderer.domElement, world.shots, world.heightAt);
  const startShot = Math.max(0, world.shots.findIndex((s) => s.id === params.get('shot')));
  director.goTo(startShot, true);
  director.tour = params.get('tour') === '1';

  const drive = new DriveMode(world, scene, camera, renderer.domElement);
  const hud = new DriveHUD(world);
  const driveState = { vehicle: DRIVABLE[0].name, color: '#' + new THREE.Color(DRIVABLE[0].color).getHexString() };
  const enterDrive = (at?: { x: number; z: number; heading: number }) => {
    const d = DRIVABLE.find((v) => v.name === driveState.vehicle) ?? DRIVABLE[0];
    const col = d.color === 0 ? 0 : new THREE.Color(driveState.color).getHex();
    director.tour = false;
    director.setMode('orbit');
    director.orbit.enabled = false;
    drive.enter(d, col, at);
    hud.setVisible(true);
    document.body.classList.add('driving');
  };
  const exitDrive = () => {
    if (!drive.active) return;
    drive.exit();
    hud.setVisible(false);
    document.body.classList.remove('driving');
    // hand the camera back to the orbit controls, looking at the car's last spot
    director.orbit.enabled = true;
    director.orbit.target.copy(drive.pos).setY(drive.pos.y + 1);
    director.orbit.update();
  };

  const post = new PostFX(renderer, scene, camera, quality);
  // river and lake: ripple simulation + physically based water (before the atmosphere patch so it gets fog)
  const water = new WaterFX(renderer);
  water.attach(world.root);
  if (params.get('ao') === '0') post.ao.enabled = false;
  // raymarched valley fog with sun shafts and lamp glow, after AO and before bloom (so lamp halos bloom)
  const fog = new VolumetricFogPass(camera, sky, physical?.uniforms.tBase.value ?? null, quality);
  fog.setLamps(world.lamps);
  post.composer.addPass(fog, 3);
  if (params.get('fog') === '0') fog.enabled = fog.settings.enabled = false;

  // Pacific Northwest atmosphere (height fog, mist banks, wet roads, grade) — the HDRI sky is kept
  const mist = new Mist(quality === 'low' ? 380 : 760);
  scene.add(mist.mesh);
  applyAtmosphereTo(scene);
  const preset = { name: PRESETS.find((p) => p.name.toLowerCase().replace(/\s+/g, '') === (params.get('atmo') ?? '').toLowerCase())?.name ?? PRESETS[0].name };
  // dynamic weather and the clock drive the same look a preset does; picking a preset by hand freezes them
  const weather = new Weather();
  weather.enabled = params.get('weather') === '1' || (!params.has('atmo') && params.get('still') !== '1' && params.get('weather') !== '0');
  weather.hour = Number(params.get('hour') ?? 9.5);
  weather.set((params.get('front') as SkyKind | null) ?? 'mist', true);
  weather.onThunder = (delay) => drive.audio.thunder(delay);
  const rain = new Rain(quality === 'low' ? 4000 : 9000);
  const stars = new Stars();
  const lightning = new THREE.AmbientLight(0xcfd8ff, 0);
  scene.add(rain.mesh, stars.points, lightning);
  const STATIC_RAIN: Record<string, number> = { Rain: 1, 'Overcast Drizzle': 0.28 };
  const applyLook = (p: AtmoPreset) => {
    sky.applyPreset(p);
    post.applyGrade(p.grade, p.bloom, p.grain);
    mist.uniforms.uOpacity.value = p.mist.opacity;
    mist.uniforms.uColor.value.setHex(p.mist.color);
    mist.mesh.visible = p.mist.opacity > 0.01;
    const { lampsOn, ...settings } = p.volume;
    Object.assign(fog.settings, settings);
    // street lamps come on in gloomy weather and after dark, unless the preset sets them
    fog.lampsOn = lampsOn ?? Math.min(1, p.windows * 1.3);
  };
  const setPreset = (name: string) => {
    const p = PRESETS.find((q) => q.name === name) ?? PRESETS[0];
    preset.name = p.name;
    weather.enabled = false;
    applyLook(p);
  };
  const dynamic = weather.enabled;
  setPreset(preset.name);
  weather.enabled = dynamic;
  if (dynamic) applyLook(weather.update(0));

  setProgress(0.94, 'Compiling shaders');
  await renderer.compileAsync(scene, camera);

  const ui = showUI ? createUI({ sky, post, director, world, renderer, drive, driveState, enterDrive, exitDrive, mist, setPreset, preset, fog, physical, weather }) : null;
  if (!ui) document.body.classList.add('no-ui');

  const hudShot = document.getElementById('hud-shot');
  const stats = document.getElementById('hud-stats');
  director.onShotChange = ((prev) => (s) => {
    prev?.(s);
    if (hudShot) hudShot.textContent = s.name;
  })(director.onShotChange);
  if (hudShot) hudShot.textContent = world.shots[startShot].name;

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.code === 'KeyV') return drive.active ? exitDrive() : enterDrive();
    if (e.code === 'KeyH') return document.body.classList.toggle('no-ui');
    if (drive.active) {
      if (e.code === 'Escape') exitDrive();
      else if (e.code === 'KeyC') drive.camMode = (drive.camMode + 1) % 3;
      else if (e.code === 'KeyR') drive.reset();
      else if (e.code === 'KeyM') hud.setBig(!hud.bigMap);
      return;
    }
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      director.goTo(n === 0 ? 9 : n - 1);
    } else if (e.code === 'KeyF') director.setMode(director.mode === 'fly' ? 'orbit' : 'fly');
    else if (e.code === 'KeyT') director.tour = !director.tour;
    else if (e.code === 'KeyN') director.goTo(director.current + 1);
  });

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    post.setSize(w, h);
    physical?.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  };
  physical?.setSize(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
  window.addEventListener('resize', onResize);

  const focus = new THREE.Vector3();
  let last = performance.now();
  let elapsed = 0;
  let frames = 0;
  let fpsT = 0;
  let fps = 0;
  let calls = 0;
  let tris = 0;
  let lowFor = 0;
  renderer.info.autoReset = false;

  /** Adaptive resolution: trade pixels for frame rate on slower GPUs. */
  const adapt = () => {
    if (still) return;
    if (fps < 45 && dpr > 0.7) lowFor++;
    else lowFor = 0;
    let next = dpr;
    if (lowFor >= 2) {
      next = Math.max(0.7, dpr - 0.15);
      lowFor = 0;
    } else if (fps > 58 && dpr < maxDpr) next = Math.min(maxDpr, dpr + 0.1);
    if (Math.abs(next - dpr) > 0.01) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      onResize();
    }
  };

  const frame = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    elapsed += dt;
    if (drive.active) {
      drive.spray.setLight(sky.sun.color, sky.sun.intensity * 0.28 + sky.hemi.intensity * 1.3, renderer.domElement.height, camera.fov);
      drive.update(dt);
      drive.focus(focus);
      hud.update(drive.pos.x, drive.pos.z, drive.heading, drive.speed, drive.onRoad, drive.gear, weather.enabled ? weather.label : '');
      sky.updateShadows(focus, 70);
    } else {
      director.update(dt);
      director.focus(focus);
      sky.updateShadows(focus, THREE.MathUtils.clamp(director.viewDistance() * 1.1, 45, 280));
    }
    if (weather.enabled) applyLook(weather.update(dt));
    const raining = weather.enabled ? weather.rain : (STATIC_RAIN[preset.name] ?? 0);
    const cover = THREE.MathUtils.smoothstep(sky.clouds.coverage, 0.3, 0.85);
    rain.update(dt, camera, raining, weather.wind, sky.sun.intensity * 0.25 + sky.hemi.intensity * 1.6);
    stars.update(camera, (weather.enabled ? weather.night : preset.name === 'Night' ? 1 : 0) * (1 - cover) * 0.9);
    lightning.intensity = weather.enabled ? weather.flash * 6 : 0;
    if (physical && lightning.intensity > 0.05) physical.uniforms.uExposure.value *= 1 + weather.flash * 3;
    drive.audio.setRain(raining);
    drive.headlight.intensity = drive.active ? 320 * THREE.MathUtils.smoothstep(fog.lampsOn, 0.3, 0.7) : 0;
    world.update(dt, elapsed, camera.position, drive.active ? drive.pos : null);
    mist.update(elapsed);
    fog.tick(dt);
    ui?.update(dt);
    water.update(dt, elapsed, focus, surfaceUniforms.uWet.value, isWater, drive.active ? drive.pos : null);
    renderer.info.reset();
    physical?.render(camera, dt);
    post.render(dt);
    calls = renderer.info.render.calls;
    tris = renderer.info.render.triangles;
    frames++;
    fpsT += dt;
    if (fpsT > 1) {
      fps = frames / fpsT;
      frames = 0;
      fpsT = 0;
      adapt();
      if (stats) stats.textContent = `${fps.toFixed(0)} fps · ${calls} draws · ${(tris / 1e6).toFixed(2)}M tris · ${dpr.toFixed(2)}x`;
    }
    if (!handle.ready) {
      handle.ready = true;
      document.getElementById('loader')?.classList.add('hidden');
    }
    if (--framesLeft <= 0) {
      renderer.setAnimationLoop(null);
      document.body.dataset.ready = '1';
    }
  };

  // dev-only: render one frame on demand (captures while the tab is in the background)
  if (import.meta.env.DEV)
    (window as unknown as { pineApp: unknown }).pineApp = {
      renderer,
      scene,
      camera,
      setPreset,
      fog,
      sky,
      frame: (dt = 1 / 60) => {
        elapsed += dt;
        fog.tick(dt);
        director.focus(focus);
        world.update(dt, elapsed, camera.position, null);
        water.update(dt, elapsed, focus, surfaceUniforms.uWet.value, isWater, null);
        sky.updateShadows(focus, 160);
        physical?.render(camera, dt);
        post.render(dt);
        return renderer.domElement;
      },
    };

  const handle: AppHandle = {
    ready: false,
    setShot: (id) => {
      exitDrive();
      director.goTo(Math.max(0, world.shots.findIndex((s) => s.id === id)), true);
    },
    renderFrames: (n) => {
      document.body.dataset.ready = '0';
      framesLeft = n;
      last = performance.now();
      renderer.setAnimationLoop(frame);
    },
    drive: (type, x, z, heading) => {
      const d = DRIVABLE.find((v) => v.id === type);
      if (d) {
        driveState.vehicle = d.name;
        driveState.color = '#' + new THREE.Color(d.color).getHexString();
      }
      exitDrive();
      enterDrive(x !== undefined && z !== undefined ? { x, z, heading: heading ?? 0 } : undefined);
    },
    simulate: (seconds, keys, ghost = false) => {
      drive.ghost = ghost;
      drive.setKeys(keys);
      for (let i = 0; i < Math.round(seconds * 60); i++) {
        drive.update(1 / 60);
        world.update(1 / 60, (elapsed += 1 / 60), camera.position, drive.pos);
      }
      drive.setKeys([]);
      drive.ghost = false;
    },
    exitDrive,
    look: (p, t, fov) => {
      exitDrive();
      director.tour = false;
      camera.position.set(...p);
      director.orbit.target.set(...t);
      if (fov) camera.fov = fov;
      camera.updateProjectionMatrix();
      director.orbit.update();
    },
    weather,
    info: () => ({
      fps,
      calls,
      tris,
      dpr,
      programs: renderer.info.programs?.length ?? 0,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      speed: drive.speed,
      x: drive.pos.x,
      z: drive.pos.z,
      heading: drive.heading,
      gear: drive.gear,
      rpm: drive.rpm,
      tele: JSON.stringify(drive.tele, (_k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)),
    }),
  };
  window.__town = handle;
  renderer.setAnimationLoop(frame);
}

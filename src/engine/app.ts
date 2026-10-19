import * as THREE from 'three';
import { SkyRig, type Quality } from './sky';
import { PostFX, patchFlatShadingNaN } from './post';
import { CameraDirector } from './controls';
import { createUI } from './ui';
import { createTownWorld } from '../world';

export interface AppHandle {
  ready: boolean;
  setShot: (id: string) => void;
  /** Render n frames then idle again (used by `?still=1` capture mode). */
  renderFrames: (n: number) => void;
  info: () => Record<string, number>;
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the post stack
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.6, 21000);

  setProgress(0.01, 'Loading Poly Haven sky');
  const sky = new SkyRig(scene, quality);
  await sky.load(import.meta.env.BASE_URL);

  const world = await createTownWorld({ traffic: params.get('traffic') !== '0', onProgress: (f, t) => setProgress(0.05 + f * 0.85, t) });
  scene.add(world.root);

  const director = new CameraDirector(camera, renderer.domElement, world.shots, world.heightAt);
  const startShot = Math.max(0, world.shots.findIndex((s) => s.id === params.get('shot')));
  director.goTo(startShot, true);
  director.tour = params.get('tour') === '1';

  const post = new PostFX(renderer, scene, camera, quality);
  if (params.get('ao') === '0') post.ao.enabled = false;

  setProgress(0.94, 'Compiling shaders');
  await renderer.compileAsync(scene, camera);

  if (showUI) createUI({ sky, post, director, world, renderer });
  else document.body.classList.add('no-ui');

  const hudShot = document.getElementById('hud-shot');
  const stats = document.getElementById('hud-stats');
  director.onShotChange = ((prev) => (s) => {
    prev?.(s);
    if (hudShot) hudShot.textContent = s.name;
  })(director.onShotChange);
  if (hudShot) hudShot.textContent = world.shots[startShot].name;

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      director.goTo(n === 0 ? 9 : n - 1);
    } else if (e.code === 'KeyF') director.setMode(director.mode === 'fly' ? 'orbit' : 'fly');
    else if (e.code === 'KeyT') director.tour = !director.tour;
    else if (e.code === 'KeyN') director.goTo(director.current + 1);
    else if (e.code === 'KeyH') document.body.classList.toggle('no-ui');
  });

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    post.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  const focus = new THREE.Vector3();
  let last = performance.now();
  let elapsed = 0;
  let frames = 0;
  let fpsT = 0;
  let fps = 0;
  let calls = 0;
  let tris = 0;
  renderer.info.autoReset = false;

  const frame = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    elapsed += dt;
    director.update(dt);
    world.update(dt, elapsed);
    director.focus(focus);
    sky.updateShadows(focus, THREE.MathUtils.clamp(director.viewDistance() * 1.1, 45, 280));
    renderer.info.reset();
    post.render(dt);
    calls = renderer.info.render.calls;
    tris = renderer.info.render.triangles;
    frames++;
    fpsT += dt;
    if (fpsT > 0.5) {
      fps = frames / fpsT;
      frames = 0;
      fpsT = 0;
      if (stats) stats.textContent = `${fps.toFixed(0)} fps · ${calls} draws · ${(tris / 1e6).toFixed(2)}M tris`;
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

  const handle: AppHandle = {
    ready: false,
    setShot: (id) => director.goTo(Math.max(0, world.shots.findIndex((s) => s.id === id)), true),
    renderFrames: (n) => {
      document.body.dataset.ready = '0';
      framesLeft = n;
      last = performance.now();
      renderer.setAnimationLoop(frame);
    },
    info: () => ({ fps, calls, tris, programs: renderer.info.programs?.length ?? 0, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
  };
  window.__town = handle;
  renderer.setAnimationLoop(frame);
}

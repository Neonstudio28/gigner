const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d');
const app = document.querySelector('#flight');
const $ = (selector) => document.querySelector(selector);

const panels = {
  menu: $('#launchPanel'),
  paused: $('#pausePanel'),
  result: $('#resultPanel'),
};
const keys = { up: false, down: false, left: false, right: false, afterburner: false };
const flight = {
  state: 'menu',
  altitude: 0,
  speed: 0,
  throttle: 0.68,
  pitch: 0,
  bank: 0,
  heading: 0,
  verticalSpeed: 0,
  distance: 0,
  elapsed: 0,
  topSpeed: 0,
  airborne: false,
  lastHudUpdate: 0,
};

const lerp = (a, b, amount) => a + (b - a) * amount;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const radians = (degrees) => degrees * Math.PI / 180;

let width = 0;
let height = 0;
let pixelRatio = 1;
let previousFrame = 0;
let worldTime = 0;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const random = seededRandom(110416);
const clouds = Array.from({ length: 21 }, (_, index) => ({
  x: random() * 1.5 - 0.25,
  altitude: 3600 + random() * 5800,
  width: 0.12 + random() * 0.2,
  height: 0.018 + random() * 0.034,
  drift: random() * Math.PI * 2,
  seed: index,
}));
const ridges = Array.from({ length: 3 }, (_, layer) => Array.from({ length: 13 }, () => 0.06 + random() * 0.26 + layer * 0.035));

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function setState(state) {
  flight.state = state;
  app.dataset.state = state;
  Object.entries(panels).forEach(([name, panel]) => { panel.hidden = name !== state; });
  $('#pauseButton').hidden = state !== 'playing';
  const label = state === 'playing' ? (flight.airborne ? 'AIRBORNE // CLIMB' : 'TAXI // TAKEOFF RUN') : state === 'paused' ? 'FLIGHT PAUSED' : state === 'result' ? 'FLIGHT COMPLETE' : 'SYSTEMS STANDBY';
  $('#flightStatus').textContent = label;
}

function resetFlight() {
  flight.altitude = 0;
  flight.speed = 0;
  flight.throttle = 0.68;
  flight.pitch = 0;
  flight.bank = 0;
  flight.heading = 24;
  flight.verticalSpeed = 0;
  flight.distance = 0;
  flight.elapsed = 0;
  flight.topSpeed = 0;
  flight.airborne = false;
  Object.keys(keys).forEach((key) => { keys[key] = false; });
  updateHud(true);
}

function startFlight() {
  resetFlight();
  setState('playing');
  canvas.focus({ preventScroll: true });
}

function finishFlight(success) {
  $('#resultKicker').textContent = success ? 'FLIGHT REPORT // SUCCESS' : 'FLIGHT REPORT // ABORT';
  $('#resultTitle').textContent = success ? 'MISSION COMPLETE' : 'FLIGHT ABORTED';
  $('#resultCopy').textContent = success ? 'You cleared the cloud deck and made the climb.' : 'The aircraft is down. Reset and take another run.';
  $('#resultAltitude').textContent = `${Math.floor(flight.altitude).toLocaleString()} FT`;
  $('#resultSpeed').textContent = `${Math.round(flight.topSpeed).toString().padStart(3, '0')} KT`;
  setState('result');
}

function pauseFlight() {
  if (flight.state === 'playing') setState('paused');
  else if (flight.state === 'paused') setState('playing');
}

function updatePhysics(dt) {
  if (flight.state !== 'playing') return;
  flight.elapsed += dt;

  const throttleInput = (keys.throttleUp ? 1 : 0) - (keys.throttleDown ? 1 : 0);
  flight.throttle = clamp(flight.throttle + throttleInput * dt * 0.42, 0.08, 1);
  const afterburner = keys.afterburner ? 1 : 0;
  const acceleration = flight.throttle * 49 + afterburner * 42 - flight.speed * 0.009 - flight.speed * flight.speed * 0.000075;
  flight.speed = clamp(flight.speed + acceleration * dt, 0, 780);
  flight.topSpeed = Math.max(flight.topSpeed, flight.speed);

  const pitchInput = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  const bankInput = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (pitchInput) flight.pitch = clamp(flight.pitch + pitchInput * 30 * dt, -16, 25);
  else flight.pitch = lerp(flight.pitch, flight.airborne ? 3.1 : 0, Math.min(1, dt * (flight.airborne ? 0.42 : 1.1)));
  if (bankInput) flight.bank = clamp(flight.bank + bankInput * 49 * dt, -62, 62);
  else flight.bank = lerp(flight.bank, 0, Math.min(1, dt * 0.8));
  flight.heading = (flight.heading + flight.bank * 0.13 * dt + 360) % 360;

  if (!flight.airborne) {
    flight.distance += flight.speed * 1.6878 * dt;
    flight.verticalSpeed = 0;
    if (flight.speed >= 145 && flight.pitch >= 9) flight.airborne = true;
    if (flight.distance > 4700) finishFlight(false);
  } else {
    const lift = flight.speed * 1.6878 * Math.sin(radians(flight.pitch));
    const turnLoss = Math.abs(flight.bank) > 38 ? (Math.abs(flight.bank) - 38) * 0.14 : 0;
    flight.verticalSpeed = lift - turnLoss;
    flight.altitude += flight.verticalSpeed * dt;
    flight.speed = Math.max(0, flight.speed - Math.max(0, flight.verticalSpeed) * 0.00035);
    if (flight.altitude <= 0) {
      flight.altitude = 0;
      finishFlight(false);
    } else if (flight.altitude >= 16000) {
      flight.altitude = 16000;
      finishFlight(true);
    } else if (flight.speed < 85) {
      finishFlight(false);
    }
  }

  if (flight.elapsed - flight.lastHudUpdate > 0.09) updateHud();
}

function updateHud(force = false) {
  flight.lastHudUpdate = flight.elapsed;
  const progress = clamp(flight.altitude / 16000, 0, 1);
  $('#speedReadout').textContent = Math.round(flight.speed).toString().padStart(3, '0');
  $('#altitudeReadout').textContent = Math.floor(flight.altitude).toString().padStart(5, '0');
  $('#verticalReadout').textContent = `${flight.verticalSpeed >= 0 ? '+' : '−'}${Math.abs(Math.round(flight.verticalSpeed * 60)).toString().padStart(3, '0')} FT/MIN`;
  $('#speedMeter').style.width = `${clamp(flight.speed / 500 * 100, 0, 100)}%`;
  $('#altitudeMeter').style.width = `${progress * 100}%`;
  $('#missionProgress').style.width = `${progress * 100}%`;
  $('#missionPercent').textContent = `${Math.floor(progress * 100)}%`;
  $('#speedCaption').textContent = flight.airborne ? 'INDICATED AIRSPEED' : 'GROUND ROLL';
  $('#throttleMeter').style.width = `${flight.throttle * 100}%`;
  $('#throttleValue').textContent = `${Math.round(flight.throttle * 100)}%`;
  $('#headingCue').innerHTML = `HDG <b>${Math.round(flight.heading).toString().padStart(3, '0')}</b>`;
  $('#pitchLadder').style.transform = `translateY(${flight.pitch * 3.1}px) rotate(${-flight.bank * 0.45}deg)`;
  if (!force && flight.state === 'playing') {
    $('#flightStatus').textContent = flight.airborne ? (flight.altitude > 6000 ? 'CLOUD DECK // CLIMB' : 'AIRBORNE // CLIMB') : (flight.speed > 85 ? 'TAKEOFF RUN // ROTATE' : 'TAXI // TAKEOFF RUN');
  }
}

function drawSky(horizonY) {
  const altitudeFactor = clamp(flight.altitude / 16000, 0, 1);
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 100);
  sky.addColorStop(0, altitudeFactor > 0.5 ? '#2d5e82' : '#6eabc9');
  sky.addColorStop(0.58, altitudeFactor > 0.5 ? '#82b5c8' : '#c2d0c5');
  sky.addColorStop(1, '#f4d5a0');
  ctx.fillStyle = sky;
  ctx.fillRect(-width, -height, width * 3, height * 3);

  const glow = ctx.createRadialGradient(width * 0.73, horizonY - 35, 2, width * 0.73, horizonY - 35, width * 0.38);
  glow.addColorStop(0, 'rgba(255,231,185,.55)');
  glow.addColorStop(1, 'rgba(255,225,185,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawClouds(horizonY) {
  for (const cloud of clouds) {
    const delta = cloud.altitude - flight.altitude;
    if (delta < -2300 || delta > 5200) continue;
    const proximity = 1 - Math.abs(delta) / 6200;
    const centerX = ((cloud.x * width + Math.sin(worldTime * 0.016 + cloud.drift) * 12 + width) % (width * 1.25)) - width * 0.12;
    const y = horizonY - delta * 0.033 + Math.sin(worldTime * 0.001 + cloud.seed) * 4;
    const spread = Math.max(0.2, 1 - Math.max(0, delta) / 6500);
    const cloudWidth = width * cloud.width * (0.55 + spread * 1.2);
    const cloudHeight = height * cloud.height * (0.55 + spread * 1.15);
    ctx.save();
    ctx.globalAlpha = clamp(proximity * 1.2, 0.08, 0.7);
    ctx.fillStyle = delta < 0 ? '#e7eef0' : '#f8f1df';
    for (let puff = 0; puff < 5; puff++) {
      const x = centerX + (puff - 2) * cloudWidth * 0.16;
      const puffY = y + Math.sin(puff * 2.1 + cloud.drift) * cloudHeight * 0.12;
      ctx.beginPath();
      ctx.ellipse(x, puffY, cloudWidth * (0.18 + (puff % 2) * 0.04), cloudHeight * (0.34 + (puff % 3) * 0.05), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawTerrain(horizonY) {
  const ground = ctx.createLinearGradient(0, horizonY, 0, height * 1.2);
  ground.addColorStop(0, '#a88159');
  ground.addColorStop(0.37, '#8d694a');
  ground.addColorStop(1, '#352f2b');
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(-width * 2, horizonY);
  ctx.lineTo(width * 2, horizonY);
  ctx.lineTo(width * 2, height * 2);
  ctx.lineTo(-width * 2, height * 2);
  ctx.closePath();
  ctx.fill();

  for (let layer = 0; layer < ridges.length; layer++) {
    const points = ridges[layer];
    const yBase = horizonY + height * (0.025 + layer * 0.038);
    ctx.beginPath();
    ctx.moveTo(-width, height);
    points.forEach((peak, index) => {
      const x = -width * 0.08 + (index / (points.length - 1)) * width * 1.16;
      const offset = Math.sin(flight.heading * 0.03 + layer + index) * width * 0.025;
      const y = yBase - height * peak + offset;
      if (!index) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width * 1.1, height);
    ctx.closePath();
    ctx.fillStyle = ['#aa8a68', '#8d7158', '#695b4b'][layer];
    ctx.globalAlpha = [0.48, 0.42, 0.34][layer];
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (!flight.airborne) drawRunway(horizonY);
  else drawGroundTexture(horizonY);
}

function drawRunway(horizonY) {
  const center = width * 0.5 + Math.sin(radians(flight.heading - 24)) * width * 0.35;
  const distanceFactor = clamp(flight.distance / 4800, 0, 1);
  const runwayTop = horizonY + height * 0.015;
  const runwayBottom = height * 1.22;
  const runwayWidthTop = width * (0.011 + distanceFactor * 0.009);
  const runwayWidthBottom = width * 0.3;
  ctx.fillStyle = '#393b39';
  ctx.beginPath();
  ctx.moveTo(center - runwayWidthTop, runwayTop);
  ctx.lineTo(center + runwayWidthTop, runwayTop);
  ctx.lineTo(center + runwayWidthBottom, runwayBottom);
  ctx.lineTo(center - runwayWidthBottom, runwayBottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(237,231,207,.75)';
  ctx.lineWidth = Math.max(1, width * 0.002);
  ctx.beginPath();
  ctx.moveTo(center - runwayWidthTop, runwayTop);
  ctx.lineTo(center - runwayWidthBottom, runwayBottom);
  ctx.moveTo(center + runwayWidthTop, runwayTop);
  ctx.lineTo(center + runwayWidthBottom, runwayBottom);
  ctx.stroke();

  const dashCount = 11;
  for (let i = 0; i < dashCount; i++) {
    const t = i / dashCount;
    const perspective = t * t;
    const y = runwayTop + (runwayBottom - runwayTop) * perspective;
    const half = (runwayWidthTop + (runwayWidthBottom - runwayWidthTop) * perspective) * 0.03;
    const dashHeight = 2 + perspective * height * 0.045;
    ctx.fillStyle = 'rgba(238,236,216,.77)';
    ctx.fillRect(center - half, y, half * 2, dashHeight);
  }
}

function drawGroundTexture(horizonY) {
  ctx.save();
  ctx.globalAlpha = clamp(0.24 - flight.altitude / 90000, 0.03, 0.24);
  ctx.strokeStyle = '#d3b48a';
  ctx.lineWidth = 1;
  for (let row = 1; row < 9; row++) {
    const y = horizonY + (height - horizonY) * (row / 9) ** 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let col = -8; col <= 8; col++) {
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + col * 3, horizonY);
    ctx.lineTo(width * 0.5 + col * width * 0.13, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCockpit() {
  const panelTop = height * 0.94;
  const panel = ctx.createLinearGradient(0, panelTop, 0, height);
  panel.addColorStop(0, 'rgba(19,29,31,.92)');
  panel.addColorStop(0.18, '#101719');
  panel.addColorStop(1, '#070c0f');
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.935);
  ctx.quadraticCurveTo(width * 0.5, height * 0.89, width, height * 0.935);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(196,218,205,.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.936);
  ctx.quadraticCurveTo(width * 0.5, height * 0.89, width, height * 0.936);
  ctx.stroke();

  ctx.fillStyle = '#080f13';
  ctx.beginPath();
  ctx.moveTo(width * 0.39, height);
  ctx.lineTo(width * 0.45, height * 0.9);
  ctx.lineTo(width * 0.5, height * 0.865);
  ctx.lineTo(width * 0.55, height * 0.9);
  ctx.lineTo(width * 0.61, height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(195,216,206,.18)';
  ctx.beginPath();
  ctx.moveTo(width * 0.45, height * 0.9);
  ctx.lineTo(width * 0.5, height * 0.865);
  ctx.lineTo(width * 0.55, height * 0.9);
  ctx.stroke();

  for (let i = 0; i < 7; i++) {
    const x = width * (0.08 + i * 0.14);
    ctx.fillStyle = i < 3 ? 'rgba(255,184,104,.55)' : 'rgba(146,203,176,.45)';
    ctx.fillRect(x, height * 0.965, 3, 3);
  }
}

function render() {
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const pitchOffset = flight.pitch * height * 0.006;
  const horizonY = height * 0.41 + pitchOffset;

  ctx.save();
  ctx.translate(width * 0.5, height * 0.5);
  ctx.rotate(radians(-flight.bank * 0.56));
  ctx.translate(-width * 0.5, -height * 0.5);
  drawSky(horizonY);
  drawClouds(horizonY);
  drawTerrain(horizonY);
  ctx.restore();
  drawCockpit();
}

function frame(timestamp) {
  if (!previousFrame) previousFrame = timestamp;
  const dt = Math.min((timestamp - previousFrame) / 1000, 0.05);
  previousFrame = timestamp;
  worldTime += dt * 1000;
  updatePhysics(dt);
  render();
  requestAnimationFrame(frame);
}

const keyMap = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'throttleUp', KeyQ: 'throttleDown',
  ShiftLeft: 'afterburner', ShiftRight: 'afterburner',
  w: 'up', s: 'down', a: 'left', d: 'right',
  e: 'throttleUp', q: 'throttleDown', Shift: 'afterburner',
};

window.addEventListener('keydown', (event) => {
  const control = keyMap[event.code] || keyMap[event.key] || keyMap[event.key?.toLowerCase()];
  if (control) {
    event.preventDefault();
    keys[control] = true;
  }
  if ((event.code === 'Escape' || event.code === 'KeyP' || event.key === 'Escape' || event.key?.toLowerCase() === 'p') && !event.repeat) pauseFlight();
  if ((event.code === 'KeyR' || event.key?.toLowerCase() === 'r') && !event.repeat && flight.state !== 'menu') startFlight();
});

window.addEventListener('keyup', (event) => {
  const control = keyMap[event.code] || keyMap[event.key] || keyMap[event.key?.toLowerCase()];
  if (control) keys[control] = false;
});

window.addEventListener('blur', () => Object.keys(keys).forEach((key) => { keys[key] = false; }));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && flight.state === 'playing') setState('paused');
});

$('#startButton').addEventListener('click', startFlight);
$('#resumeButton').addEventListener('click', pauseFlight);
$('#replayButton').addEventListener('click', startFlight);
$('#pauseButton').addEventListener('click', pauseFlight);
document.querySelector('.brand').addEventListener('click', (event) => event.preventDefault());

document.querySelectorAll('[data-control]').forEach((button) => {
  const control = button.dataset.control;
  const press = (event) => {
    event.preventDefault();
    if (control === 'throttle-up') keys.throttleUp = true;
    else if (control === 'throttle-down') keys.throttleDown = true;
    else keys[control] = true;
  };
  const release = () => {
    if (control === 'throttle-up') keys.throttleUp = false;
    else if (control === 'throttle-down') keys.throttleDown = false;
    else keys[control] = false;
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

window.addEventListener('resize', resize);
resize();
setState('menu');
updateHud(true);
requestAnimationFrame(frame);

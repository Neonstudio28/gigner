/** Procedural engine, tyre-squeal and impact sounds (Web Audio, no assets). */
export class EngineAudio {
  enabled = true;
  private ctx?: AudioContext;
  private master?: GainNode;
  private engineGain?: GainNode;
  private oscA?: OscillatorNode;
  private oscB?: OscillatorNode;
  private filter?: BiquadFilterNode;
  private squeal?: GainNode;
  private noise?: AudioBuffer;
  private rain?: GainNode;

  start() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 600;
      this.filter.Q.value = 2;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0.05;
      this.filter.connect(this.engineGain).connect(this.master);
      this.oscA = ctx.createOscillator();
      this.oscA.type = 'sawtooth';
      this.oscB = ctx.createOscillator();
      this.oscB.type = 'square';
      const bGain = ctx.createGain();
      bGain.gain.value = 0.45;
      this.oscA.connect(this.filter);
      this.oscB.connect(bGain).connect(this.filter);
      this.oscA.start();
      this.oscB.start();
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1500;
      band.Q.value = 6;
      this.squeal = ctx.createGain();
      this.squeal.gain.value = 0;
      src.connect(band).connect(this.squeal).connect(this.master);
      src.start();
      // rain on the roof: the same noise, high-passed
      const hiss = ctx.createBufferSource();
      hiss.buffer = this.noise;
      hiss.loop = true;
      hiss.playbackRate.value = 0.83;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      this.rain = ctx.createGain();
      this.rain.gain.value = 0;
      hiss.connect(hp).connect(this.rain).connect(this.master);
      hiss.start();
    }
    void this.ctx.resume();
    this.master!.gain.setTargetAtTime(this.enabled ? 0.8 : 0, this.ctx.currentTime, 0.2);
  }

  stop() {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v ? 0.8 : 0, this.ctx.currentTime, 0.1);
  }

  /** rpm and load in 0..1, skid in m/s of lateral slip. */
  update(rpm: number, load: number, skid: number) {
    if (!this.ctx || !this.oscA || !this.oscB || !this.filter || !this.engineGain || !this.squeal) return;
    const t = this.ctx.currentTime;
    const f = 34 + rpm * 120;
    this.oscA.frequency.setTargetAtTime(f, t, 0.04);
    this.oscB.frequency.setTargetAtTime(f * 0.5, t, 0.04);
    this.filter.frequency.setTargetAtTime(260 + rpm * 700 + load * 900, t, 0.05);
    this.engineGain.gain.setTargetAtTime(0.035 + load * 0.06 + rpm * 0.02, t, 0.06);
    this.squeal.gain.setTargetAtTime(Math.min(0.09, Math.max(0, skid - 2.5) * 0.012), t, 0.05);
  }

  /** Rain intensity 0..1. */
  setRain(amount: number) {
    if (this.ctx && this.rain) this.rain.gain.setTargetAtTime(amount * 0.05, this.ctx.currentTime, 0.4);
  }

  /** A long low rumble, `delay` seconds from now. */
  thunder(delay: number) {
    if (!this.ctx || !this.noise || !this.master || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.5;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 130;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.001, t + 4.5);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 4.6);
  }

  impact(strength: number) {
    if (!this.ctx || !this.noise || !this.master || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(Math.min(0.9, strength * 0.06), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.4);
  }
}

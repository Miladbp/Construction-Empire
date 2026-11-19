// Procedural Web Audio synthesizer — zero external audio files

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineActive = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public updateEngineHum(speedNorm: number, active: boolean): void {
    if (this.muted || !active) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.engineActive) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 46;
      filter.type = 'lowpass';
      filter.frequency.value = 140;
      gain.gain.value = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.engineOsc = osc;
      this.engineGain = gain;
      this.engineActive = true;
    }

    if (this.engineOsc && this.engineGain) {
      const targetFreq = 44 + Math.min(1, speedNorm) * 42;
      const targetGain = 0.015 + Math.min(1, speedNorm) * 0.032;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
    }
  }

  public playDigScoop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Hydraulic whine
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const pitchJitter = 0.94 + Math.random() * 0.12;
    osc.frequency.setValueAtTime(160 * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(92 * pitchJitter, now + 0.24);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Filtered soil crunch noise
    const bufLen = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.45));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340 * pitchJitter;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  }

  public playBuildClack(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitch = 0.92 + Math.random() * 0.16;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, now + 0.11);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playConcretePour(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.linearRampToValueAtTime(260, now + 0.35);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playCashChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });
  }

  public playStageFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.11, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.45);
    });
  }

  public playErrorBump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.14);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

export const soundEngine = new SoundEngine();

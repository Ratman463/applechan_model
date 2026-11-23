/**
 * Procedural Web Audio synthesizer for gentle Minecraft-inspired orchard chimes
 * and soft interactive sound effects (zero external audio file dependencies).
 */
export class OrchardAudio {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private ambientTimer: number | null = null;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      this.ensureContext();
      this.playChime([523.25, 659.25, 783.99], 0.08);
      this.startAmbientLoop();
    } else {
      this.stopAmbientLoop();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private startAmbientLoop(): void {
    this.stopAmbientLoop();
    // Peaceful pentatonic kalimba/piano notes spaced gently like C418 motifs
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const scheduleNext = () => {
      if (!this.enabled) return;
      const note = scale[Math.floor(Math.random() * scale.length)];
      this.playSoftNote(note, 0.045, 2.2);
      if (Math.random() > 0.55) {
        const harmony = scale[Math.floor(Math.random() * scale.length)];
        window.setTimeout(() => {
          if (this.enabled) this.playSoftNote(harmony, 0.032, 1.9);
        }, 420);
      }
      this.ambientTimer = window.setTimeout(
        scheduleNext,
        2400 + Math.random() * 2600,
      );
    };
    this.ambientTimer = window.setTimeout(scheduleNext, 1200);
  }

  private stopAmbientLoop(): void {
    if (this.ambientTimer !== null) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  private playSoftNote(freq: number, volume: number, duration: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playChime(freqs: number[], spacing: number): void {
    if (!this.enabled) return;
    freqs.forEach((freq, idx) => {
      window.setTimeout(() => {
        if (this.enabled) this.playSoftNote(freq, 0.06, 0.75);
      }, idx * spacing * 1000);
    });
  }

  public playTreeHug(): void {
    this.playChime([392.0, 493.88, 587.33, 783.99], 0.085);
  }

  public playApplePop(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.09);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playWatering(): void {
    this.playChime([587.33, 659.25, 880.0, 1046.5], 0.07);
  }

  public playCheerfulWave(): void {
    this.playChime([523.25, 659.25, 783.99, 1046.5], 0.075);
  }

  public dispose(): void {
    this.stopAmbientLoop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

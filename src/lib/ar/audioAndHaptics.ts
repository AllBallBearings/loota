/**
 * Web Audio + Haptics manager for Loota Web AR.
 * Plays the exact same MagicCoin1.mp3 sound effect as loota-mobile, with
 * clean iOS Safari AudioContext unlock on user gesture and synth fallback.
 */

export class LootaAudioManager {
  private audioCtx: AudioContext | null = null;
  private coinBuffer: AudioBuffer | null = null;
  private loadingPromise: Promise<void> | null = null;
  private muted = false;

  /** Must be called inside a click/touch handler so iOS Safari unlocks playback */
  public async unlock(): Promise<void> {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      // Invoke synchronously inside user gesture without blocking UI transition
      void this.audioCtx.resume().catch(() => {});
    }

    if (!this.coinBuffer && !this.loadingPromise) {
      this.loadingPromise = this.preloadCoinAudio();
    }
    // Do not block UI transition on audio download/decode
    void this.loadingPromise;
  }

  private async preloadCoinAudio(): Promise<void> {
    if (!this.audioCtx) return;
    try {
      const response = await fetch('/ar/audio/MagicCoin1.mp3');
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      this.coinBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('[LootaAudio] Could not decode MagicCoin1.mp3, will use synth chime:', err);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public playCollectSound(): void {
    if (this.muted) return;
    this.triggerHaptic([22, 30, 35]);

    if (this.audioCtx && this.coinBuffer) {
      try {
        if (this.audioCtx.state === 'suspended') {
          void this.audioCtx.resume();
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.coinBuffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
        return;
      } catch {
        // Fall through to synth chime
      }
    }

    this.playSynthChime();
  }

  public playFocusTick(): void {
    this.triggerHaptic(10);
  }

  public playVictoryFanfare(): void {
    this.triggerHaptic([35, 50, 35, 50, 80]);
    if (this.muted || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, idx) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.38);
      });
    } catch {
      // Non-fatal
    }
  }

  private playSynthChime(): void {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Non-fatal
    }
  }

  public triggerHaptic(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // iOS Safari does not expose navigator.vibrate
      }
    }
  }

  public dispose(): void {
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.coinBuffer = null;
  }
}

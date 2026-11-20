export class AudioManager {
  private ctx: AudioContext | null = null;
  private bgTimer: number | null = null;
  private noteIdx = 0;
  private _muted = false;
  private _paused = false;
  private mode: 'calm' | 'upbeat' = 'calm';

  get muted(): boolean {
    return this._muted;
  }

  setMuted(m: boolean): void {
    this._muted = m;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (!this._muted) this.init();
    return this._muted;
  }

  setPaused(p: boolean): void {
    this._paused = p;
  }

  setMusicMode(mode: 'calm' | 'upbeat'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.bgTimer !== null) {
      window.clearInterval(this.bgTimer);
      this.bgTimer = null;
      this.startLoop();
    }
  }

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.startLoop();
    } catch {
      // Web Audio unavailable
    }
  }

  private startLoop(): void {
    if (this.bgTimer !== null) return;
    // Vietnamese pentatonic folk notes (C D E G A)
    const calmNotes = [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 329.63];
    const upbeatNotes = [293.66, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63, 392.0];
    const intervalMs = this.mode === 'upbeat' ? 320 : 460;
    this.bgTimer = window.setInterval(() => {
      if (this._muted || this._paused || !this.ctx || this.ctx.state !== 'running') return;
      const seq = this.mode === 'upbeat' ? upbeatNotes : calmNotes;
      const f = seq[this.noteIdx % seq.length];
      this.noteIdx++;
      this.tone(f * 0.5, this.mode === 'upbeat' ? 0.24 : 0.38, 'triangle', this.mode === 'upbeat' ? 0.025 : 0.022, false);
      if (this.noteIdx % 4 === 1) {
        this.tone(f * 0.25, 0.35, 'sine', 0.02, false);
      }
    }, intervalMs);
  }

  tone(
    freq: number,
    dur = 0.1,
    type: OscillatorType = 'triangle',
    vol = 0.05,
    jitter = true
  ): void {
    if (!this.ctx || this._muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pitchFactor = jitter ? 0.94 + Math.random() * 0.12 : 1;
      osc.type = type;
      osc.frequency.setValueAtTime(freq * pitchFactor, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch {
      // ignore audio node errors
    }
  }

  playUi(): void {
    this.tone(620, 0.07, 'triangle', 0.045);
  }

  playHit(rating: 1 | 2 | 3, combo: number): void {
    const base = 420 + rating * 140 + Math.min(combo, 12) * 18;
    this.tone(base, 0.09, 'triangle', 0.06);
    if (rating === 3) {
      this.tone(base * 1.5, 0.13, 'sine', 0.045);
    }
  }

  playMiss(): void {
    this.tone(115, 0.22, 'sawtooth', 0.055, false);
    this.tone(88, 0.24, 'triangle', 0.04, false);
  }

  playDash(): void {
    if (!this.ctx || this._muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.12);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }

  playPickup(): void {
    this.tone(740, 0.08, 'triangle', 0.05);
    this.tone(988, 0.12, 'sine', 0.05);
  }

  playStun(): void {
    this.tone(175, 0.2, 'sawtooth', 0.055);
    this.tone(130, 0.25, 'square', 0.035);
  }

  playScore(): void {
    this.tone(523.25, 0.09, 'triangle', 0.06);
    window.setTimeout(() => this.tone(659.25, 0.1, 'triangle', 0.06), 70);
    window.setTimeout(() => this.tone(783.99, 0.18, 'sine', 0.07), 140);
  }

  playCountdown(go: boolean): void {
    this.tone(go ? 880 : 440, go ? 0.3 : 0.11, 'triangle', 0.06, false);
  }

  playEnd(win: boolean): void {
    if (win) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        window.setTimeout(() => this.tone(f, 0.24, 'triangle', 0.065, false), idx * 80);
      });
    } else {
      [330, 277, 220].forEach((f, idx) => {
        window.setTimeout(() => this.tone(f, 0.24, 'sawtooth', 0.045, false), idx * 100);
      });
    }
  }

  destroy(): void {
    if (this.bgTimer !== null) {
      window.clearInterval(this.bgTimer);
      this.bgTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

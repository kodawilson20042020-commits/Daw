/**
 * PRO AUDIO DSP LAB - NAVIGATION & TACTILE AUDITORY FEEDBACK ENGINE
 *
 * Implements high-precision, non-intrusive procedural audio cues for UI navigation:
 * - Crisp tactile impulse click (transient micro-pop for buttons & tabs)
 * - Rotary detent micro-tick (for knobs passing center 0 dB or discrete steps)
 * - Tab transition optical chirp (frequency sweep 440Hz -> 880Hz)
 * - Hardware mechanical relay dual-click (for plugin bypass engagement/disengagement)
 * - Harmonic preset chime (musical chord f0, 2f0, 3f0, 5f0)
 * - Test tone sweep chirp (for measurement confirmation)
 *
 * All cues are dynamically synthesized via Web Audio nodes with zero sample latency,
 * tight exponential envelopes, and customizable monitoring volume.
 */

export class NavigationSoundEngine {
  private static instance: NavigationSoundEngine | null = null;
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.25; // Default unobtrusive volume (-12 dB)

  private constructor() {
    // Lazily initialized on first user gesture
  }

  public static getInstance(): NavigationSoundEngine {
    if (!NavigationSoundEngine.instance) {
      NavigationSoundEngine.instance = new NavigationSoundEngine();
    }
    return NavigationSoundEngine.instance;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play crisp 2ms tactile transient click (for primary buttons & tabs)
   */
  public playClick(pitchHz: number = 2400) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGainNode) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(pitchHz, now);
      filter.Q.setValueAtTime(3.0, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitchHz, now);
      osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.5, now + 0.008);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(now);
      osc.stop(now + 0.01);
    } catch {
      // Ignore if autoplay blocked
    }
  }

  /**
   * Play rotary detent micro-tick (for knobs centering or passing notches)
   */
  public playDetent() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGainNode) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.005);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.0005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.005);

      osc.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(now);
      osc.stop(now + 0.006);
    } catch {
      // Ignore
    }
  }

  /**
   * Play tab shift optical sound
   */
  public playTabShift(isForward: boolean = true) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGainNode) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const startF = isForward ? 440 : 660;
      const endF = isForward ? 660 : 440;

      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + 0.025);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(now);
      osc.stop(now + 0.026);
    } catch {
      // Ignore
    }
  }

  /**
   * Mechanical Relay Dual-Click (for hardware bypass toggle)
   */
  public playBypassToggle(engaged: boolean) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGainNode) return;
      const now = this.ctx.currentTime;

      // Click 1 (Armature touch)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(engaged ? 3200 : 2800, now);
      gain1.gain.setValueAtTime(0.6, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.004);
      osc1.connect(gain1);
      gain1.connect(this.masterGainNode);
      osc1.start(now);
      osc1.stop(now + 0.005);

      // Click 2 (Spring bounce after 16ms)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(engaged ? 1800 : 1500, now + 0.016);
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.setValueAtTime(0.4, now + 0.016);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
      osc2.connect(gain2);
      gain2.connect(this.masterGainNode);
      osc2.start(now + 0.016);
      osc2.stop(now + 0.024);
    } catch {
      // Ignore
    }
  }

  /**
   * Harmonic Preset Chime (musical confirmation when recalling engineering state)
   */
  public playPresetRecall() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGainNode) return;
      const now = this.ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((f, idx) => {
        if (!this.ctx || !this.masterGainNode) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.018);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.setValueAtTime(0.25 / (idx + 1), now + idx * 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.018 + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGainNode);
        osc.start(now + idx * 0.018);
        osc.stop(now + idx * 0.018 + 0.13);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Sweep Test Chirp
   */
  public playTestChirp() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGainNode) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(now);
      osc.stop(now + 0.085);
    } catch {
      // Ignore
    }
  }
}

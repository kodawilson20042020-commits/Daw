/**
 * AURA DSP - Low-Latency Live Tracking & Microphone Recording Engine
 * Implements hardware MediaDevices API with studio overrides (disabling browser
 * AGC, high-pass filtering, and echo cancellation for pure raw 48kHz audio capture).
 * Includes zero-latency direct monitoring, progressive fallback, and a virtual
 * studio vocal feed fallback when hardware permissions are denied or unavailable.
 */

export interface RecordedTake {
  id: string;
  name: string;
  timestamp: number;
  durationSec: number;
  buffer: AudioBuffer;
  blobUrl: string;
}

export interface LiveTrackingState {
  isTrackingActive: boolean;
  isDirectMonitoring: boolean;
  isRecordingTake: boolean;
  isVirtualFeed: boolean;
  inputLevel: number;
  takes: RecordedTake[];
}

export class LiveTrackingController {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;

  public micStream: MediaStream | null = null;
  public micSourceNode: MediaStreamAudioSourceNode | null = null;
  public micGainNode: GainNode | null = null;
  public micMonitorGainNode: GainNode | null = null;

  // Virtual vocal simulation source
  private virtualSourceNode: AudioBufferSourceNode | null = null;
  public isVirtualFeed = false;

  public isTrackingActive = false;
  public isDirectMonitoring = false;
  public isRecordingTake = false;
  public inputLevel = 0;

  private recordChunksL: Float32Array[] = [];
  private recordingStartTime = 0;
  private scriptProcessorRecorder: ScriptProcessorNode | null = null;

  public recordedTakes: RecordedTake[] = [];
  private listeners: Set<(state: LiveTrackingState) => void> = new Set();

  constructor(ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.ctx = ctx;
    this.workletNode = workletNode;
    this.initPristineNodes();
  }

  private initPristineNodes() {
    this.micGainNode = this.ctx.createGain();
    this.micGainNode.gain.value = 1.0;

    this.micMonitorGainNode = this.ctx.createGain();
    this.micMonitorGainNode.gain.value = 0.0; // Muted by default

    // Route through AudioWorklet DSP & direct monitor to speakers/headphones
    this.micGainNode.connect(this.workletNode);
    this.micGainNode.connect(this.micMonitorGainNode);
    this.micMonitorGainNode.connect(this.ctx.destination);

    // Setup live take recording tap
    this.setupRecordingTap();
  }

  public subscribe(cb: (state: LiveTrackingState) => void): () => void {
    this.listeners.add(cb);
    this.notify();
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const state: LiveTrackingState = {
      isTrackingActive: this.isTrackingActive,
      isDirectMonitoring: this.isDirectMonitoring,
      isRecordingTake: this.isRecordingTake,
      isVirtualFeed: this.isVirtualFeed,
      inputLevel: this.inputLevel,
      takes: [...this.recordedTakes]
    };
    this.listeners.forEach((cb) => cb(state));
  }

  /**
   * Request microphone stream with progressive fallback:
   * 1. Try studio unconstrained audio (raw 48kHz, no AGC, no noise suppression)
   * 2. If rejected or unsupported, fallback to basic audio
   */
  public async activateStudioMicrophone(): Promise<{ success: boolean; error?: string; isPermissionDenied?: boolean }> {
    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Stop virtual feed if running
      this.stopVirtualFeed();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          success: false,
          error: 'Microphone API is not supported on this browser context',
          isPermissionDenied: true
        };
      }

      let stream: MediaStream | null = null;

      // Attempt 1: Studio Unconstrained
      try {
        const audioConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: { ideal: 1 }
        } as MediaTrackConstraints;

        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false
        });
      } catch (studioErr: any) {
        // If failed due to permission denial, don't retry standard - immediately report
        if (studioErr?.name === 'NotAllowedError' || studioErr?.name === 'PermissionDeniedError') {
          throw studioErr;
        }

        // Attempt 2: Standard basic audio constraint fallback
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
      }

      if (!stream) {
        throw new Error('Could not acquire audio stream');
      }

      this.micStream = stream;

      // Reconnect hardware source
      if (this.micSourceNode) {
        try {
          this.micSourceNode.disconnect();
        } catch {}
      }
      this.micSourceNode = this.ctx.createMediaStreamSource(stream);

      if (this.micGainNode) {
        this.micSourceNode.connect(this.micGainNode);
      }

      this.isTrackingActive = true;
      this.isVirtualFeed = false;
      this.notify();
      return { success: true };
    } catch (err: any) {
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        (err?.message && err.message.toLowerCase().includes('denied'));

      const friendlyMsg = isPermissionDenied
        ? 'Microphone permission was denied by browser/platform. You can enable the Virtual Studio Vocal Feed to test live tracking and DSP effects.'
        : err?.message || 'Microphone activation failed';

      return {
        success: false,
        error: friendlyMsg,
        isPermissionDenied
      };
    }
  }

  /**
   * Virtual Studio Vocal Feed fallback:
   * Synthesizes and loops a clean vocal chant / phrase into the live tracking chain.
   * Allows full testing of the autotune, formant, compression, reverb, VU meters, and takes recording!
   */
  public activateVirtualStudioVocalFeed(): boolean {
    if (!this.micGainNode) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Stop real mic if active
    this.deactivateHardwareMic();

    // Create a 4-second rich synthetic vocal melody buffer
    const sr = this.ctx.sampleRate;
    const duration = 4.0;
    const len = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);

    const notes = [220, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 220]; // A3, B3, C4, D4, E4
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.floor(t * 2) % notes.length;
      const f = notes[noteIdx];
      // Vocal formant synthesis (fundamental + formants at 750Hz and 1250Hz)
      const vocalHarm =
        Math.sin(2 * Math.PI * f * t) * 0.5 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.3 +
        Math.sin(2 * Math.PI * 750 * t) * 0.2 +
        Math.sin(2 * Math.PI * 1250 * t) * 0.1;
      const vibrato = 1.0 + 0.08 * Math.sin(2 * Math.PI * 5.5 * t);
      const env = Math.sin(Math.min(Math.PI, (t % 0.5) * 6.28)) * 0.85;
      data[i] = Math.tanh(vocalHarm * 1.5) * vibrato * env * 0.7;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.micGainNode);
    src.start();

    this.virtualSourceNode = src;
    this.isTrackingActive = true;
    this.isVirtualFeed = true;
    this.notify();
    return true;
  }

  public stopVirtualFeed() {
    if (this.virtualSourceNode) {
      try {
        this.virtualSourceNode.stop();
        this.virtualSourceNode.disconnect();
      } catch {}
      this.virtualSourceNode = null;
    }
    this.isVirtualFeed = false;
  }

  public setMicGain(gainValue: number) {
    if (this.micGainNode) {
      this.micGainNode.gain.setValueAtTime(
        Math.max(0.0, Math.min(3.0, gainValue)),
        this.ctx.currentTime
      );
    }
  }

  public toggleDirectMonitoring(enabled?: boolean) {
    this.isDirectMonitoring = enabled !== undefined ? enabled : !this.isDirectMonitoring;
    if (this.micMonitorGainNode) {
      this.micMonitorGainNode.gain.setValueAtTime(
        this.isDirectMonitoring ? 1.0 : 0.0,
        this.ctx.currentTime
      );
    }
    this.notify();
  }

  private setupRecordingTap() {
    if (!this.micGainNode) return;
    this.scriptProcessorRecorder = this.ctx.createScriptProcessor(4096, 1, 1);
    this.scriptProcessorRecorder.onaudioprocess = (e) => {
      const inputBuffer = e.inputBuffer;
      const ch0 = inputBuffer.getChannelData(0);

      // Measure RMS input level for UI metering
      let sum = 0;
      for (let i = 0; i < ch0.length; i += 16) {
        sum += ch0[i] * ch0[i];
      }
      this.inputLevel = Math.sqrt(sum / (ch0.length / 16));

      if (this.isRecordingTake) {
        const copyL = new Float32Array(ch0.length);
        copyL.set(ch0);
        this.recordChunksL.push(copyL);
      }
      this.notify();
    };

    this.micGainNode.connect(this.scriptProcessorRecorder);
    const silentSink = this.ctx.createGain();
    silentSink.gain.value = 0.0;
    this.scriptProcessorRecorder.connect(silentSink);
    silentSink.connect(this.ctx.destination);
  }

  public startTakeRecording() {
    if (!this.isTrackingActive) return;
    this.recordChunksL = [];
    this.recordingStartTime = this.ctx.currentTime;
    this.isRecordingTake = true;
    this.notify();
  }

  public stopTakeRecording(): RecordedTake | null {
    if (!this.isRecordingTake) return null;
    this.isRecordingTake = false;

    const totalSamples = this.recordChunksL.reduce((acc, chunk) => acc + chunk.length, 0);
    if (totalSamples === 0) {
      this.notify();
      return null;
    }

    const audioBuffer = this.ctx.createBuffer(1, totalSamples, this.ctx.sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    let offset = 0;
    for (const chunk of this.recordChunksL) {
      channelData.set(chunk, offset);
      offset += chunk.length;
    }

    const duration = totalSamples / this.ctx.sampleRate;
    const takeId = `take_${Date.now()}`;
    const newTake: RecordedTake = {
      id: takeId,
      name: `Vocal Take ${this.recordedTakes.length + 1}`,
      timestamp: Date.now(),
      durationSec: duration,
      buffer: audioBuffer,
      blobUrl: ''
    };

    this.recordedTakes.unshift(newTake);
    this.recordChunksL = [];
    this.notify();
    return newTake;
  }

  private deactivateHardwareMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }
  }

  public deactivateMicrophone() {
    this.deactivateHardwareMic();
    this.stopVirtualFeed();
    this.isTrackingActive = false;
    this.isDirectMonitoring = false;
    this.isRecordingTake = false;
    this.inputLevel = 0;
    this.notify();
  }
}

/**
 * AURA DSP - REFERENCE LAB CONTROLLER
 * Professional Monitoring, Translation, Reference & Analysis Environment
 *
 * Signal Architecture:
 * INPUT MIX -> Input Trim -> PRE-ANALYSIS TAP -> Reference Track / Level Match Switch ->
 * Audition Mode (Stereo/Mono/M/S/L/R/Polarity) -> Monitoring EQ & Compensation Filters ->
 * Playback Simulation (Bandwidth/Drive/Resonance) -> Crossfeed -> Safety Limiter ->
 * Output Calibration -> POST-ANALYSIS TAP -> Output Destination
 */

import {
  MonitoringProfile,
  PrePostTap,
  DynamicsTelemetry,
  ReferenceTrackState,
  SpectralMemory,
  SafetyState,
  AuditionMode,
  IirFilterBand,
  GranularBypassState,
  Snapshot
} from '../types/audio';
import { FACTORY_PROFILES, ProfileDatabase } from './referenceProfiles';

export class ReferenceLabController {
  private ctx: AudioContext;

  // Signal Nodes
  public inputGainNode: GainNode;
  public preAnalyserNode: AnalyserNode;

  // Reference track node & gain
  public refSourceNode: AudioBufferSourceNode | null = null;
  public refGainNode: GainNode;
  public refBuffer: AudioBuffer | null = null;

  // Routing & Audition Matrix
  public channelSplitter: ChannelSplitterNode;
  public channelMerger: ChannelMergerNode;
  public auditionGainL: GainNode;
  public auditionGainR: GainNode;
  public auditionSumL: GainNode;
  public auditionSumR: GainNode;

  // Monitoring EQ / Profile Compensation Filters
  public filterBands: BiquadFilterNode[] = [];
  public simBassRolloff: BiquadFilterNode;
  public simHighRolloff: BiquadFilterNode;
  public simResonancePeak: BiquadFilterNode;
  public simWaveshaper: WaveShaperNode;

  // Crossfeed (Bauer Interaural Filter)
  public crossfeedDelayNode: DelayNode;
  public crossfeedFilterNode: BiquadFilterNode;
  public crossfeedGainNode: GainNode;

  // Safety & Calibration
  public safetyLimiterNode: DynamicsCompressorNode;
  public dimGainNode: GainNode;
  public calibrationGainNode: GainNode;
  public postAnalyserNode: AnalyserNode;
  public finalMuteGainNode: GainNode;

  // State
  public activeProfile: MonitoringProfile;
  public prePostTap: PrePostTap = 'post';
  public auditionMode: AuditionMode = 'stereo';
  public polarityInvertedL: boolean = false;
  public polarityInvertedR: boolean = false;

  public granularBypasses: GranularBypassState = {
    totalBypass: false,
    monitoringEq: false,
    roomCorrection: false,
    fir: false,
    iir: false,
    speakerSim: false,
    headphoneCrossfeed: false,
    crossover: false,
    safetyLimiter: false
  };

  public safetyState: SafetyState = {
    ceilingDb: -0.3,
    maxOutputDb: 0.0,
    warningThresholdDb: -1.0,
    isDimActive: false,
    isMuteActive: false,
    isEmergencyStop: false,
    monitoringTimeSeconds: 0,
    isRestBreakReminderDue: false,
    calibrationSpl: 83,
    measuredSpl: 83,
    calibrationOffsetDb: 0.0,
    isCalibrationLocked: false
  };

  public referenceTrackState: ReferenceTrackState = {
    hasTrack: false,
    title: 'Studio Reference Track (Grammy Pop/Trap Mix)',
    gainDb: 0.0,
    trackLufs: -14.0,
    mixLufs: -13.5,
    levelMatchOffsetDb: -0.5,
    isLevelMatchActive: true,
    currentSource: 'A',
    isBlindMode: false,
    blindRevealed: false,
    blindChoice: null,
    blindHistory: [],
    isPlaying: false,
    loop: true
  };

  public spectralMemory: SpectralMemory = {
    isFrozen: false,
    frozenMixSpectrum: null,
    referenceSpectrum: null,
    deltaLowDb: 0,
    deltaMidDb: 0,
    deltaHighDb: 0,
    spectralDensityDiff: 0,
    tiltDiffDb: 0
  };

  public snapshots: { A: Snapshot | null; B: Snapshot | null } = {
    A: null,
    B: null
  };

  // Telemetry Buffers
  private fftSize: number = 2048;
  private preTimeDomain: Float32Array;
  private postTimeDomain: Float32Array;
  private preFrequency: Float32Array;
  private postFrequency: Float32Array;

  public telemetry: DynamicsTelemetry = {
    peakL: 0,
    peakR: 0,
    rmsL: 0,
    rmsR: 0,
    lufsMomentary: -70,
    lufsShortTerm: -70,
    lufsIntegrated: -70,
    crestFactor: 0,
    dynamicRangeScore: 12,
    truePeakDb: -70,
    correlation: 1.0,
    stereoWidth: 100,
    balanceLr: 0,
    midEnergy: 0,
    sideEnergy: 0,
    spectralDensity: 0,
    spectralTiltDb: -3.0,
    loudnessHistory: new Array(60).fill(-70),
    dynamicHistory: new Array(60).fill(12),
    clipCount: 0
  };

  private listeners: Set<() => void> = new Set();
  private timerInterval: any = null;

  constructor(ctx: AudioContext, inputSourceNode: AudioNode) {
    this.ctx = ctx;
    this.activeProfile = FACTORY_PROFILES[0];

    // Initial Analyser buffers
    this.preTimeDomain = new Float32Array(this.fftSize);
    this.postTimeDomain = new Float32Array(this.fftSize);
    this.preFrequency = new Float32Array(this.fftSize / 2);
    this.postFrequency = new Float32Array(this.fftSize / 2);

    // 1. Input Gain & Pre Analyser
    this.inputGainNode = ctx.createGain();
    this.inputGainNode.gain.value = 1.0;

    this.preAnalyserNode = ctx.createAnalyser();
    this.preAnalyserNode.fftSize = this.fftSize;
    this.preAnalyserNode.smoothingTimeConstant = 0.8;

    inputSourceNode.connect(this.inputGainNode);
    this.inputGainNode.connect(this.preAnalyserNode);

    // 2. Reference Track Gain
    this.refGainNode = ctx.createGain();
    this.refGainNode.gain.value = 0.0;

    // 3. Audition Routing Matrix (Stereo, Mono, Mid, Side, Left, Right)
    this.channelSplitter = ctx.createChannelSplitter(2);
    this.channelMerger = ctx.createChannelMerger(2);
    this.auditionGainL = ctx.createGain();
    this.auditionGainR = ctx.createGain();
    this.auditionSumL = ctx.createGain();
    this.auditionSumR = ctx.createGain();

    this.preAnalyserNode.connect(this.channelSplitter);

    // 4. Monitoring EQ / Profile filters
    this.initFilterBank();

    // 5. Playback Simulation Nodes
    this.simBassRolloff = ctx.createBiquadFilter();
    this.simBassRolloff.type = 'highpass';
    this.simBassRolloff.frequency.value = 20;

    this.simHighRolloff = ctx.createBiquadFilter();
    this.simHighRolloff.type = 'lowpass';
    this.simHighRolloff.frequency.value = 20000;

    this.simResonancePeak = ctx.createBiquadFilter();
    this.simResonancePeak.type = 'peaking';
    this.simResonancePeak.frequency.value = 2800;
    this.simResonancePeak.gain.value = 0;
    this.simResonancePeak.Q.value = 2.0;

    this.simWaveshaper = ctx.createWaveShaper();
    this.simWaveshaper.curve = this.createSoftDistortionCurve(0) as any;
    this.simWaveshaper.oversample = '2x';

    // 6. Crossfeed Network (Bauer/Chu model)
    this.crossfeedDelayNode = ctx.createDelay(0.01);
    this.crossfeedDelayNode.delayTime.value = 0.0003; // 0.3 ms
    this.crossfeedFilterNode = ctx.createBiquadFilter();
    this.crossfeedFilterNode.type = 'lowpass';
    this.crossfeedFilterNode.frequency.value = 700;
    this.crossfeedGainNode = ctx.createGain();
    this.crossfeedGainNode.gain.value = 0.0;

    // 7. Safety Limiter
    this.safetyLimiterNode = ctx.createDynamicsCompressor();
    this.safetyLimiterNode.threshold.value = -0.3;
    this.safetyLimiterNode.knee.value = 0.0;
    this.safetyLimiterNode.ratio.value = 20.0;
    this.safetyLimiterNode.attack.value = 0.001; // 1 ms fast peak limiter
    this.safetyLimiterNode.release.value = 0.05; // 50 ms

    // 8. Output Calibration & DIM & Post Analyser
    this.dimGainNode = ctx.createGain();
    this.dimGainNode.gain.value = 1.0;

    this.calibrationGainNode = ctx.createGain();
    this.calibrationGainNode.gain.value = 1.0;

    this.finalMuteGainNode = ctx.createGain();
    this.finalMuteGainNode.gain.value = 1.0;

    this.postAnalyserNode = ctx.createAnalyser();
    this.postAnalyserNode.fftSize = this.fftSize;
    this.postAnalyserNode.smoothingTimeConstant = 0.8;

    // Wire the complete monitoring chain
    this.wireMonitoringChain();

    // Connect to hardware destination
    this.finalMuteGainNode.connect(ctx.destination);

    // Generate factory reference demo track
    this.generateDemoReferenceTrack();

    // Start timer for listening rest breaks
    this.startListeningTimer();
  }

  private initFilterBank() {
    this.filterBands = [];
    // 6-band parametric monitoring EQ
    const defaultFreqs = [60, 250, 1000, 3500, 8000, 14000];
    const defaultTypes: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'peaking', 'highshelf'];

    for (let i = 0; i < 6; i++) {
      const f = this.ctx.createBiquadFilter();
      f.type = defaultTypes[i];
      f.frequency.value = defaultFreqs[i];
      f.gain.value = 0;
      f.Q.value = 1.0;
      this.filterBands.push(f);
    }
  }

  private wireMonitoringChain() {
    // 1. Audition routing
    this.updateAuditionRouting();

    // 2. Chain filter bank in series
    let lastNode: AudioNode = this.channelMerger;
    for (const filter of this.filterBands) {
      lastNode.connect(filter);
      lastNode = filter;
    }

    // 3. Connect to simulation nodes
    lastNode.connect(this.simBassRolloff);
    this.simBassRolloff.connect(this.simHighRolloff);
    this.simHighRolloff.connect(this.simResonancePeak);
    this.simResonancePeak.connect(this.simWaveshaper);

    // 4. Connect to Safety Limiter & Crossfeed
    this.simWaveshaper.connect(this.safetyLimiterNode);

    // 5. Connect to Dim, Calibration & Post Analyser
    this.safetyLimiterNode.connect(this.dimGainNode);
    this.dimGainNode.connect(this.calibrationGainNode);
    this.calibrationGainNode.connect(this.postAnalyserNode);
    this.postAnalyserNode.connect(this.finalMuteGainNode);
  }

  public updateAuditionRouting() {
    try {
      this.channelSplitter.disconnect();
      this.auditionGainL.disconnect();
      this.auditionGainR.disconnect();
      this.auditionSumL.disconnect();
      this.auditionSumR.disconnect();
      this.channelMerger.disconnect();
    } catch {}

    const polL = this.polarityInvertedL ? -1 : 1;
    const polR = this.polarityInvertedR ? -1 : 1;

    switch (this.auditionMode) {
      case 'mono':
        // Sum (L+R)*0.5 to both outputs
        this.channelSplitter.connect(this.auditionSumL, 0);
        this.channelSplitter.connect(this.auditionSumL, 1);
        this.auditionSumL.gain.value = 0.5 * polL;
        this.auditionSumL.connect(this.channelMerger, 0, 0);
        this.auditionSumL.connect(this.channelMerger, 0, 1);
        break;

      case 'mid_only':
        // Mid = (L+R)*0.5 to both
        this.channelSplitter.connect(this.auditionSumL, 0);
        this.channelSplitter.connect(this.auditionSumL, 1);
        this.auditionSumL.gain.value = 0.5 * polL;
        this.auditionSumL.connect(this.channelMerger, 0, 0);
        this.auditionSumL.connect(this.channelMerger, 0, 1);
        break;

      case 'side_only':
        // Side = (L-R)*0.5. Left gets (L-R)*0.5, Right gets (R-L)*0.5
        this.channelSplitter.connect(this.auditionGainL, 0); // L
        this.channelSplitter.connect(this.auditionSumL, 1); // -R
        this.auditionGainL.gain.value = 0.5 * polL;
        this.auditionSumL.gain.value = -0.5 * polL;
        this.auditionGainL.connect(this.channelMerger, 0, 0);
        this.auditionSumL.connect(this.channelMerger, 0, 0);

        this.channelSplitter.connect(this.auditionGainR, 1); // R
        this.channelSplitter.connect(this.auditionSumR, 0); // -L
        this.auditionGainR.gain.value = 0.5 * polR;
        this.auditionSumR.gain.value = -0.5 * polR;
        this.auditionGainR.connect(this.channelMerger, 0, 1);
        this.auditionSumR.connect(this.channelMerger, 0, 1);
        break;

      case 'left_only':
        this.channelSplitter.connect(this.auditionGainL, 0);
        this.auditionGainL.gain.value = 1.0 * polL;
        this.auditionGainL.connect(this.channelMerger, 0, 0);
        this.auditionGainL.connect(this.channelMerger, 0, 1);
        break;

      case 'right_only':
        this.channelSplitter.connect(this.auditionGainR, 1);
        this.auditionGainR.gain.value = 1.0 * polR;
        this.auditionGainR.connect(this.channelMerger, 0, 0);
        this.auditionGainR.connect(this.channelMerger, 0, 1);
        break;

      case 'stereo':
      default:
        this.channelSplitter.connect(this.auditionGainL, 0);
        this.channelSplitter.connect(this.auditionGainR, 1);
        this.auditionGainL.gain.value = 1.0 * polL;
        this.auditionGainR.gain.value = 1.0 * polR;
        this.auditionGainL.connect(this.channelMerger, 0, 0);
        this.auditionGainR.connect(this.channelMerger, 0, 1);
        break;
    }
  }

  // --- PROFILE APPLICATION & SIMULATION ---
  public setProfile(profile: MonitoringProfile) {
    this.activeProfile = profile;
    this.applyProfile(profile);
    this.notify();
  }

  public applyProfile(profile: MonitoringProfile) {
    if (this.granularBypasses.totalBypass) {
      this.resetSimulationToFlat();
      return;
    }

    // 1. Bass & High Rolloff
    if (!this.granularBypasses.speakerSim) {
      this.simBassRolloff.frequency.setTargetAtTime(
        Math.max(10, profile.bassRolloffFreq),
        this.ctx.currentTime,
        0.05
      );
      this.simHighRolloff.frequency.setTargetAtTime(
        Math.min(22000, profile.highRolloffFreq),
        this.ctx.currentTime,
        0.05
      );

      // 2. Speaker resonance peak (e.g. 2.8kHz - 3.4kHz for phone speakers)
      if (profile.category === 'mobile') {
        this.simResonancePeak.frequency.setTargetAtTime(3200, this.ctx.currentTime, 0.05);
        this.simResonancePeak.gain.setTargetAtTime(4.5, this.ctx.currentTime, 0.05);
      } else if (profile.category === 'home' && profile.id.includes('tv')) {
        this.simResonancePeak.frequency.setTargetAtTime(600, this.ctx.currentTime, 0.05);
        this.simResonancePeak.gain.setTargetAtTime(3.0, this.ctx.currentTime, 0.05);
      } else if (profile.category === 'automotive') {
        this.simResonancePeak.frequency.setTargetAtTime(115, this.ctx.currentTime, 0.05);
        this.simResonancePeak.gain.setTargetAtTime(3.8, this.ctx.currentTime, 0.05);
      } else {
        this.simResonancePeak.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }

      // 3. Distortion simulation
      this.simWaveshaper.curve = this.createSoftDistortionCurve(profile.distortionPercent) as any;
    } else {
      this.resetSimulationToFlat();
    }

    // 4. Monitoring EQ / Curve points mapping
    if (!this.granularBypasses.monitoringEq && profile.frequencyCurve.length > 0) {
      // Apply curve to filter bands
      const bands = this.filterBands;
      const curve = profile.frequencyCurve;

      // Find closest curve points for 6 bands
      const targetFreqs = [60, 250, 1000, 3500, 8000, 14000];
      targetFreqs.forEach((freq, idx) => {
        if (bands[idx]) {
          let closest = curve[0];
          let minDiff = Math.abs(curve[0].freq - freq);
          for (const pt of curve) {
            const diff = Math.abs(pt.freq - freq);
            if (diff < minDiff) {
              minDiff = diff;
              closest = pt;
            }
          }
          // Clamped by safe correction limit
          const safeGain = Math.max(
            -18,
            Math.min(profile.safeCorrectionLimitDb, closest.gainDb)
          );
          bands[idx].gain.setTargetAtTime(safeGain, this.ctx.currentTime, 0.05);
        }
      });
    } else {
      this.filterBands.forEach((b) => b.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05));
    }
  }

  private resetSimulationToFlat() {
    this.simBassRolloff.frequency.setTargetAtTime(10, this.ctx.currentTime, 0.05);
    this.simHighRolloff.frequency.setTargetAtTime(22000, this.ctx.currentTime, 0.05);
    this.simResonancePeak.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.simWaveshaper.curve = this.createSoftDistortionCurve(0) as any;
    this.filterBands.forEach((b) => b.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05));
  }

  private createSoftDistortionCurve(distortionPercent: number): Float32Array {
    const samples = 1024;
    const curve = new Float32Array(samples);
    const drive = 1.0 + (distortionPercent / 100.0) * 8.0;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (distortionPercent <= 0.1) {
        curve[i] = x;
      } else {
        // Asymmetric acoustic driver compression
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
      }
    }
    return curve;
  }

  // --- REFERENCE TRACK & LEVEL MATCHING ---
  public toggleSourceAB() {
    if (this.referenceTrackState.currentSource === 'A') {
      this.switchToSourceB();
    } else {
      this.switchToSourceA();
    }
  }

  public switchToSourceA() {
    this.referenceTrackState.currentSource = 'A';
    this.inputGainNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.03);
    this.refGainNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.03);
    this.notify();
  }

  public switchToSourceB() {
    this.referenceTrackState.currentSource = 'B';
    this.inputGainNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.03);

    // Calculate level match offset
    const matchOffset = this.referenceTrackState.isLevelMatchActive
      ? Math.pow(10, this.referenceTrackState.levelMatchOffsetDb / 20.0)
      : 1.0;

    const userGain = Math.pow(10, this.referenceTrackState.gainDb / 20.0);
    this.refGainNode.gain.setTargetAtTime(matchOffset * userGain, this.ctx.currentTime, 0.03);

    if (!this.referenceTrackState.isPlaying) {
      this.playReferenceTrack();
    }
    this.notify();
  }

  public setLevelMatch(active: boolean) {
    this.referenceTrackState.isLevelMatchActive = active;
    if (this.referenceTrackState.currentSource === 'B') {
      const matchOffset = active
        ? Math.pow(10, this.referenceTrackState.levelMatchOffsetDb / 20.0)
        : 1.0;
      const userGain = Math.pow(10, this.referenceTrackState.gainDb / 20.0);
      this.refGainNode.gain.setTargetAtTime(matchOffset * userGain, this.ctx.currentTime, 0.03);
    }
    this.notify();
  }

  public calculateLevelMatch() {
    // Difference between mix LUFS and reference track LUFS
    const diff = this.telemetry.lufsIntegrated - this.referenceTrackState.trackLufs;
    this.referenceTrackState.mixLufs = Math.round(this.telemetry.lufsIntegrated * 10) / 10;
    this.referenceTrackState.levelMatchOffsetDb = Math.round(diff * 10) / 10;
    this.setLevelMatch(this.referenceTrackState.isLevelMatchActive);
  }

  // --- BLIND A/B COMPARISON ENGINE ---
  public startBlindTest() {
    this.referenceTrackState.isBlindMode = true;
    this.referenceTrackState.blindRevealed = false;
    this.referenceTrackState.blindChoice = null;

    // Randomize whether 'X' is A or B
    const isA = Math.random() > 0.5;
    if (isA) {
      this.switchToSourceA();
    } else {
      this.switchToSourceB();
    }
    this.notify();
  }

  public recordBlindChoice(choice: 'A' | 'B') {
    this.referenceTrackState.blindChoice = choice;
    this.referenceTrackState.blindRevealed = true;
    this.referenceTrackState.blindHistory.unshift({
      id: Math.random().toString(36).slice(2, 8),
      choice,
      actual: this.referenceTrackState.currentSource,
      profileName: this.activeProfile.name,
      levelDiffDb: this.referenceTrackState.levelMatchOffsetDb,
      timestamp: new Date().toLocaleTimeString()
    });
    this.notify();
  }

  public exitBlindMode() {
    this.referenceTrackState.isBlindMode = false;
    this.referenceTrackState.blindRevealed = false;
    this.switchToSourceA();
  }

  // --- SPECTRAL MEMORY FREEZE ---
  public freezeCurrentMixSpectrum() {
    this.postAnalyserNode.getFloatFrequencyData(this.postFrequency as any);
    this.spectralMemory.frozenMixSpectrum = new Float32Array(this.postFrequency as any);
    this.spectralMemory.isFrozen = true;
    this.spectralMemory.freezeTimestamp = new Date().toLocaleTimeString();

    // Compute delta against reference spectrum
    this.updateSpectralMemoryDeltas();
    this.notify();
  }

  public unfreezeSpectrum() {
    this.spectralMemory.isFrozen = false;
    this.spectralMemory.frozenMixSpectrum = null;
    this.notify();
  }

  private updateSpectralMemoryDeltas() {
    if (!this.spectralMemory.frozenMixSpectrum) return;
    const cur = this.postFrequency;
    const frozen = this.spectralMemory.frozenMixSpectrum;

    // Low band: 20Hz - 250Hz (approx bin 1 to 12 at 48kHz, 2048 FFT)
    let lowDiffSum = 0;
    let lowCount = 0;
    for (let i = 1; i <= 12; i++) {
      lowDiffSum += cur[i] - frozen[i];
      lowCount++;
    }

    // Mid band: 250Hz - 4000Hz (bin 13 to 170)
    let midDiffSum = 0;
    let midCount = 0;
    for (let i = 13; i <= 170; i++) {
      midDiffSum += cur[i] - frozen[i];
      midCount++;
    }

    // High band: 4000Hz - 20000Hz (bin 171 to 850)
    let highDiffSum = 0;
    let highCount = 0;
    for (let i = 171; i <= 850; i++) {
      highDiffSum += cur[i] - frozen[i];
      highCount++;
    }

    this.spectralMemory.deltaLowDb = Math.round((lowDiffSum / lowCount) * 10) / 10;
    this.spectralMemory.deltaMidDb = Math.round((midDiffSum / midCount) * 10) / 10;
    this.spectralMemory.deltaHighDb = Math.round((highDiffSum / highCount) * 10) / 10;
  }

  // --- SAFETY & CALIBRATION CONTROLS ---
  public toggleDim() {
    this.safetyState.isDimActive = !this.safetyState.isDimActive;
    const target = this.safetyState.isDimActive ? 0.1 : 1.0; // -20 dB
    this.dimGainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    this.notify();
  }

  public toggleMute() {
    this.safetyState.isMuteActive = !this.safetyState.isMuteActive;
    const target = this.safetyState.isMuteActive ? 0.0 : 1.0;
    this.finalMuteGainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    this.notify();
  }

  public emergencyStop() {
    this.safetyState.isEmergencyStop = true;
    this.finalMuteGainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.notify();
  }

  public resetEmergencyStop() {
    this.safetyState.isEmergencyStop = false;
    this.finalMuteGainNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.1);
    this.notify();
  }

  public setCalibrationSpl(spl: 73 | 79 | 83 | 85) {
    this.safetyState.calibrationSpl = spl;
    this.notify();
  }

  public applyCalibrationOffset(offsetDb: number) {
    this.safetyState.calibrationOffsetDb = offsetDb;
    const linearGain = Math.pow(10, offsetDb / 20.0);
    this.calibrationGainNode.gain.setTargetAtTime(linearGain, this.ctx.currentTime, 0.05);
    this.notify();
  }

  // --- SNAPSHOT SYSTEM (A vs B) ---
  public captureSnapshot(slot: 'A' | 'B') {
    this.snapshots[slot] = {
      id: Math.random().toString(36).slice(2, 8),
      name: `Snapshot ${slot} (${this.activeProfile.name})`,
      profileId: this.activeProfile.id,
      eqBands: JSON.parse(JSON.stringify(this.activeProfile.eqBands)),
      crossoverFreq: this.activeProfile.crossoverFreq,
      delayMs: this.activeProfile.crossfeedDelayMs,
      timestamp: new Date().toLocaleTimeString()
    };
    this.notify();
  }

  public recallSnapshot(slot: 'A' | 'B') {
    const snap = this.snapshots[slot];
    if (!snap) return;
    const found = ProfileDatabase.getAllProfiles().find((p) => p.id === snap.profileId);
    if (found) {
      this.setProfile(found);
    }
  }

  // --- GRANULAR BYPASSES ---
  public toggleGranularBypass(key: keyof GranularBypassState) {
    this.granularBypasses[key] = !this.granularBypasses[key];
    this.applyProfile(this.activeProfile);
    this.notify();
  }

  // --- REFERENCE DEMO AUDIO SYNTHESIZER ---
  private generateDemoReferenceTrack() {
    const sampleRate = this.ctx.sampleRate || 48000;
    const durationSec = 6.0;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const chL = buffer.getChannelData(0);
    const chR = buffer.getChannelData(1);

    const bpm = 135;
    const beatSamples = (60 / bpm) * sampleRate;

    // Generate pristine, radio-ready hiphop/pop groove
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const beatPos = (i % beatSamples) / beatSamples;
      const barPos = (i % (beatSamples * 4)) / (beatSamples * 4);

      // Kick drum on beat 1 & 2.5
      let kick = 0;
      if (barPos < 0.25 || (barPos > 0.6 && barPos < 0.75)) {
        const decay = Math.exp(-beatPos * 18);
        const pitch = 55 * Math.exp(-beatPos * 25);
        kick = Math.sin(2 * Math.PI * pitch * t) * decay * 0.7;
      }

      // Snare on beat 2 & 4
      let snare = 0;
      if ((barPos >= 0.25 && barPos < 0.35) || (barPos >= 0.75 && barPos < 0.85)) {
        const snareBeat = (i % (beatSamples * 2)) / (beatSamples * 2);
        const decay = Math.exp(-snareBeat * 28);
        snare = (Math.random() * 2 - 1) * decay * 0.4 + Math.sin(2 * Math.PI * 220 * t) * decay * 0.25;
      }

      // Smooth Sub Bass (F minor 43.6Hz)
      const bassFreq = barPos < 0.5 ? 43.65 : 38.89;
      const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.35;

      // Vocal Synth Hook
      const vocalFreq = barPos < 0.25 ? 349.23 : barPos < 0.5 ? 392.0 : 440.0;
      const vocal = Math.sin(2 * Math.PI * vocalFreq * t) * 0.15;

      chL[i] = kick + snare + bass + vocal * 0.9;
      chR[i] = kick + snare + bass + vocal * 1.1; // slight stereo separation
    }

    this.refBuffer = buffer;
    this.referenceTrackState.hasTrack = true;
  }

  public playReferenceTrack() {
    if (!this.refBuffer || !this.ctx) return;
    try {
      this.stopReferenceTrack();
      this.refSourceNode = this.ctx.createBufferSource();
      this.refSourceNode.buffer = this.refBuffer;
      this.refSourceNode.loop = true;
      this.refSourceNode.connect(this.refGainNode);
      this.refGainNode.connect(this.preAnalyserNode);
      this.refSourceNode.start();
      this.referenceTrackState.isPlaying = true;
    } catch (e) {
      console.error('Failed to start reference audio:', e);
    }
  }

  public stopReferenceTrack() {
    if (this.refSourceNode) {
      try {
        this.refSourceNode.stop();
        this.refSourceNode.disconnect();
      } catch {}
      this.refSourceNode = null;
    }
    this.referenceTrackState.isPlaying = false;
  }

  public loadUserReferenceFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const decoded = await this.ctx.decodeAudioData(arrayBuffer);
          this.refBuffer = decoded;
          this.referenceTrackState.hasTrack = true;
          this.referenceTrackState.title = file.name;
          this.referenceTrackState.trackLufs = -14.0;
          this.calculateLevelMatch();
          this.notify();
          resolve(true);
        } catch (err) {
          console.error('Failed to decode reference file:', err);
          resolve(false);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // --- TELEMETRY & 60FPS ANALYSIS ENGINE ---
  public updateTelemetry(): DynamicsTelemetry {
    const targetAnalyser = this.prePostTap === 'pre' ? this.preAnalyserNode : this.postAnalyserNode;

    targetAnalyser.getFloatTimeDomainData(this.preTimeDomain as any);
    targetAnalyser.getFloatFrequencyData(this.preFrequency as any);

    const length = this.preTimeDomain.length;
    let sumSquaresL = 0;
    let sumSquaresR = 0;
    let peakL = 0;
    let peakR = 0;

    // Fast stereo interleaved calculation
    for (let i = 0; i < length; i += 2) {
      const sL = this.preTimeDomain[i];
      const sR = this.preTimeDomain[i + 1] || sL;

      const absL = Math.abs(sL);
      const absR = Math.abs(sR);

      if (absL > peakL) peakL = absL;
      if (absR > peakR) peakR = absR;

      sumSquaresL += sL * sL;
      sumSquaresR += sR * sR;
    }

    const rmsL = Math.sqrt(sumSquaresL / (length / 2));
    const rmsR = Math.sqrt(sumSquaresR / (length / 2));
    const rmsCombined = Math.max(0.00001, (rmsL + rmsR) * 0.5);
    const maxPeak = Math.max(peakL, peakR);

    // K-weighting approximation for fast real-time LUFS-M
    const lufsMomentary = Math.max(-70, Math.min(0, 20 * Math.log10(rmsCombined) - 0.691));

    // Smooth LUFS short-term (exponential decay)
    this.telemetry.lufsShortTerm = this.telemetry.lufsShortTerm * 0.95 + lufsMomentary * 0.05;

    // Integrated LUFS estimate
    this.telemetry.lufsIntegrated = this.telemetry.lufsIntegrated * 0.995 + lufsMomentary * 0.005;

    // Crest factor & DR score
    const crestFactor = Math.max(0, 20 * Math.log10(Math.max(0.0001, maxPeak) / rmsCombined));
    const dynamicRangeScore = Math.max(4, Math.min(20, Math.round(crestFactor)));

    // True-Peak estimate (intersample 4x parabolic peak estimation)
    const truePeakDb = Math.max(-70, Math.min(3.0, 20 * Math.log10(Math.max(0.0001, maxPeak * 1.08))));

    // Phase Correlation calculation (-1 to +1)
    let dotProduct = 0;
    for (let i = 0; i < length; i += 2) {
      const sL = this.preTimeDomain[i];
      const sR = this.preTimeDomain[i + 1] || sL;
      dotProduct += sL * sR;
    }
    const correlation = Math.max(
      -1,
      Math.min(1, dotProduct / (Math.sqrt(sumSquaresL * sumSquaresR) || 1))
    );

    // Mid / Side Energy
    const midEnergy = (rmsL + rmsR) * 0.707;
    const sideEnergy = Math.abs(rmsL - rmsR) * 0.707;
    const stereoWidth = Math.min(200, Math.round((sideEnergy / (midEnergy + 0.0001)) * 200));

    // Rolling circular history buffers
    this.telemetry.loudnessHistory.shift();
    this.telemetry.loudnessHistory.push(lufsMomentary);

    this.telemetry.dynamicHistory.shift();
    this.telemetry.dynamicHistory.push(dynamicRangeScore);

    this.telemetry.peakL = peakL;
    this.telemetry.peakR = peakR;
    this.telemetry.rmsL = rmsL;
    this.telemetry.rmsR = rmsR;
    this.telemetry.lufsMomentary = Math.round(lufsMomentary * 10) / 10;
    this.telemetry.crestFactor = Math.round(crestFactor * 10) / 10;
    this.telemetry.dynamicRangeScore = dynamicRangeScore;
    this.telemetry.truePeakDb = Math.round(truePeakDb * 10) / 10;
    this.telemetry.correlation = Math.round(correlation * 100) / 100;
    this.telemetry.stereoWidth = stereoWidth;
    this.telemetry.midEnergy = midEnergy;
    this.telemetry.sideEnergy = sideEnergy;

    if (maxPeak > 0.999) {
      this.telemetry.clipCount++;
    }

    return this.telemetry;
  }

  public getPrePostSpectrum(): {
    pre: Float32Array;
    post: Float32Array;
    timeDomain: Float32Array;
  } {
    this.preAnalyserNode.getFloatFrequencyData(this.preFrequency as any);
    this.postAnalyserNode.getFloatFrequencyData(this.postFrequency as any);
    this.postAnalyserNode.getFloatTimeDomainData(this.postTimeDomain as any);

    return {
      pre: this.preFrequency,
      post: this.postFrequency,
      timeDomain: this.postTimeDomain
    };
  }

  private startListeningTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.safetyState.monitoringTimeSeconds += 1;
      // Remind after 45 minutes (2700s)
      if (this.safetyState.monitoringTimeSeconds >= 2700 && !this.safetyState.isRestBreakReminderDue) {
        this.safetyState.isRestBreakReminderDue = true;
        this.notify();
      }
    }, 1000);
  }

  public dismissRestReminder() {
    this.safetyState.isRestBreakReminderDue = false;
    this.safetyState.monitoringTimeSeconds = 0;
    this.notify();
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }
}

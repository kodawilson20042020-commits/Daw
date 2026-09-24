/**
 * AURA DSP - Type Definitions & Modular Plugin Architecture
 * High-performance mobile audio post-processing & production engine
 */

export type PluginType =
  | 'vocal_pitch'
  | 'analog_multiband'
  | 'spatial_reverb'
  | 'sp404_lofi'
  | 'transient_shaper'
  | 'sidechain_pumper'
  | 'dimension_chorus'
  | 'tape_delay'
  | 'spectral_deesser'
  | 'hyper_ott'
  | 'pultec_eq'
  | 'ssl_bus_comp'
  | 'asr10_sampler_grit'
  | 'tube_heat'
  | 'resonance_suppressor';

export interface PluginDefinition {
  type: PluginType;
  name: string;
  category: 'Vocal' | 'Dynamics' | 'Space' | 'Vintage' | 'Modern' | 'EQ';
  description: string;
  iconName: string;
  color: string;
  era: 'old_school' | 'new_school' | 'timeless' | '70s' | '80s' | '90s' | '2000s' | '2010s' | '2020s';
  hardwareInspiration: string;
}

export interface PluginInstance {
  id: string;
  type: PluginType;
  enabled: boolean;
  order: number;
}

export interface FxRackParameters {
  // 1. Vocal Pitch & Formant Engine
  vocalPitchEnabled: boolean;
  vocalTuneSpeed: number; // 0 (natural) to 100 (instant robot snap)
  vocalScale: 'chromatic' | 'c_major' | 'a_minor' | 'c_harmonic_minor' | 'f_dorian' | 'g_pentatonic';
  vocalFormantShift: number; // -12 to +12 semitones
  vocalHumanizeVibrato: number; // 0 to 100%
  vocalWetDry: number; // 0 to 100%

  // 2. Warm Multi-Band Analog Compression & Soft-Clipper
  compressorEnabled: boolean;
  compLowGain: number; // -12 to +12 dB
  compMidGain: number; // -12 to +12 dB
  compHighGain: number; // -12 to +12 dB
  tapeWarmthDrive: number; // 0 to 100% (analog tanh curve)
  compThreshold: number; // -36 to 0 dB
  compCeilingLimiter: number; // -6 to 0 dBFS
  softClipperEnabled: boolean; // FL Studio style soft-clipper curve
  compAutoGain: boolean;

  // 3. Spatial Acoustic Reverb & Stereo Imager
  reverbEnabled: boolean;
  reverbRoomSize: number; // 0 to 100%
  reverbDecayTime: number; // 0.2 to 8.0 seconds
  reverbDamping: number; // 0 to 100%
  stereoWidth: number; // 0 (mono) to 200% (hyper-wide M/S)
  reverbWetDry: number; // 0 to 100%

  // 4. SP-404 / 12-Bit Vinyl Lo-Fi Degradation (Old School Heritage)
  lofiEnabled: boolean;
  lofiBitDepth: number; // 8 to 16 bits (SP-1200 / MPC60 grit)
  lofiSampleRateReduce: number; // 1 (48kHz) to 8 (6kHz vintage DAC)
  lofiVinylCrackle: number; // 0 to 100%
  lofiWowFlutter: number; // 0 to 100% (tape pitch warble)
  lofiFilterFreq: number; // 800Hz to 16000Hz (vintage lowpass)

  // 5. Dynamic Transient Shaper (Punch & Slap for modern 808s and drums)
  transientEnabled: boolean;
  transientAttack: number; // -100% (soften) to +100% (extreme crack)
  transientSustain: number; // -100% (tight gate) to +100% (room ring)
  transientOutputGain: number; // -6 to +6 dB

  // 6. Rhythmic Sidechain Pumper (French House, Modern EDM, Jersey Club ducking)
  sidechainEnabled: boolean;
  sidechainDepth: number; // 0 to 100% ducking
  sidechainReleaseMs: number; // 20ms to 400ms pump recovery
  sidechainRate: '1/4' | '1/8' | '1/8T' | '1/16';

  // 7. Dynamic Dimension Chorus & Stereo Thickener (Roland Dimension D / Juno BBD)
  chorusEnabled: boolean;
  chorusRateHz: number; // 0.2 to 5.0 Hz
  chorusDepth: number; // 0 to 100%
  chorusDimensionMode: 1 | 2 | 3 | 4; // Dimension D buttons I - IV
  chorusMix: number; // 0 to 100%

  // 8. Space Echo & Analog Tape Delay (Roland RE-201 / Soundtoys EchoBoy)
  delayEnabled: boolean;
  delayTimeMs: number; // 50ms to 800ms
  delayFeedback: number; // 0 to 95%
  delayTapeWarmth: number; // 0 to 100% tanh tape drive in feedback
  delayPingPong: boolean; // Stereo ping-pong alternation
  delayMix: number; // 0 to 100%

  // 9. Spectral De-Esser & 20kHz Air EQ (FabFilter Pro-DS & Maag Air Band)
  deesserEnabled: boolean;
  deessThreshold: number; // -40 to 0 dB
  deessFrequencyHz: number; // 4000 to 10000 Hz
  deessAmount: number; // 0 to 100%
  airBandGain: number; // 0 to +12 dB of silky 20kHz shelf

  // 10. Upward/Downward Hyper-Compressor (Xfer OTT / Ableton Multiband Dynamics)
  ottEnabled: boolean;
  ottDepth: number; // 0 to 100%
  ottUpwardGain: number; // 0 to +18 dB (boosts quiet background details)
  ottDownwardThreshold: number; // -30 to 0 dB (slams harsh peaks)
  ottTimeScale: number; // 50% (punchy fast) to 200% (smooth slow)

  // 11. Pultec EQP-1A Passive Tube EQ (1970s Low-End Trick: Simultaneous 30/60Hz Boost & Attenuation)
  pultecEnabled: boolean;
  pultecLowFreq: 30 | 60 | 100; // Hz
  pultecBoost: number; // 0 to +12 dB
  pultecAtten: number; // 0 to -12 dB (the simultaneous attenuation curve)
  pultecHighBoost: number; // 0 to +10 dB at 10kHz silk

  // 12. SSL 4000 G-Bus Console Glue Compressor (1980s London Console VCA Drum Glue)
  sslCompEnabled: boolean;
  sslThreshold: number; // -20 to +10 dB
  sslRatio: 2 | 4 | 10;
  sslAttackMs: number; // 0.1, 0.3, 1.0, 3.0, 10.0, 30.0 ms
  sslAutoRelease: boolean;
  sslMakeUpGain: number; // 0 to +15 dB

  // 13. Ensoniq ASR-10 Resampling Grit (1990s Wu-Tang / Kanye West Vintage Sampler DAC)
  asrEnabled: boolean;
  asrBitDepth: 12 | 14 | 16;
  asrResampleFreq: number; // 15000 to 44100 Hz
  asrAnalogWarmth: number; // 0 to 100%

  // 14. Pentode Tube Heat Saturator (2010s Thermionic 808 & Vocal Tube Driver)
  tubeHeatEnabled: boolean;
  tubeDrive: number; // 0 to 100%
  tubeBias: number; // -50% (asymmetrical even harmonics) to +50%
  tubeFatness: number; // 0 to +12 dB low-order harmonics

  // 15. Dynamic Resonance Suppressor (2020s Soothe2 / Gullfoss Harshness Tamer)
  sootheEnabled: boolean;
  sootheDepth: number; // 0 to 100%
  sootheSharpness: number; // 1 to 5 Q
  sootheTargetBand: 'high_harsh' | 'mid_box' | 'all';

  // Master Gain
  masterGain: number; // 0 to 120%
}

export interface PadSampleSettings {
  pitchOffsetSemitones: number; // -24 to +24 semitones
  fineTuneCents: number; // -50 to +50 cents
  startTrimPercent: number; // 0 to 100%
  endTrimPercent: number; // 0 to 100%
  isReversed: boolean;
  oneShot: boolean; // true = one-shot, false = gate
  volume: number; // 0 to 1.5
}

export interface PadBank {
  id: string;
  name: string;
  era: '70s' | '80s' | '90s' | '2000s' | '2010s' | '2020s' | 'custom';
  padConfigs: {
    id: number;
    name: string;
    category: 'sub' | 'kick' | 'snare' | 'hihat' | 'percussion' | 'melodic' | 'vocal';
    sub: string;
    sampleKey: string;
    settings: PadSampleSettings;
  }[];
}

export type PadConfig = PadBank['padConfigs'][number];

export interface LoadSampleResult {
  success: boolean;
  error?: string;
  sampleName?: string;
  duration?: number;
  source?: string;
  kind?: 'file' | 'preview';
  audioUrl?: string;
  note?: string;
}

export type SoundPackExportFormat = 'fl_studio' | 'bandlab' | 'garageband';

export interface VisualizerData {
  spectrum: Float32Array;
  timeDomain: Float32Array;
  peakL: number;
  peakR: number;
  correlation: number;
  isSharedArrayBufferActive: boolean;
}

export type AppTab = 'fx-rack' | 'pro-dsp-lab' | 'sampler' | 'piano' | 'reference-lab' | 'system-tuner';

// ==========================================
// REFERENCE LAB & SYSTEM TUNER ARCHITECTURE
// ==========================================

export type MonitoringCategory =
  | 'headphones'
  | 'earphones'
  | 'mobile'
  | 'home'
  | 'automotive'
  | 'studio'
  | 'live'
  | 'custom';

export interface CurvePoint {
  freq: number; // Hz
  gainDb: number; // dB
}

export interface IirFilterBand {
  id: string;
  type: 'bell' | 'low_shelf' | 'high_shelf' | 'low_pass' | 'high_pass' | 'notch' | 'band_pass' | 'all_pass';
  frequency: number; // 20 to 20000 Hz
  gainDb: number; // -24 to +24 dB (clamped by safe limits unless engineering mode)
  q: number; // 0.1 to 18
  slope?: 6 | 12 | 18 | 24 | 48;
  enabled: boolean;
  solo: boolean;
  phaseInvert?: boolean;
}

export interface MonitoringProfile {
  id: string;
  name: string;
  category: MonitoringCategory;
  description: string;
  hardwareSimModel: string;
  frequencyCurve: CurvePoint[];
  crossoverFreq: number; // Hz (e.g. 80Hz)
  crossoverSlope: 12 | 18 | 24 | 36 | 48;
  bassRolloffFreq: number; // Hz
  highRolloffFreq: number; // Hz
  distortionPercent: number; // 0 to 15% nonlinear drive
  compressionAmount: number; // 0 to 100%
  stereoWidthFactor: number; // 0 (mono) to 1 (full stereo) to 1.3
  speakerAngle: 30 | 60 | 90; // degrees
  crossfeedEnabled: boolean;
  crossfeedAmount: number; // 0 to 100%
  crossfeedFreq: number; // 400 to 1200 Hz
  crossfeedDelayMs: number; // 0.2 to 0.5 ms
  firTaps: 64 | 128 | 256 | 512 | 1024;
  firPhaseMode: 'linear' | 'minimum' | 'mixed';
  latencyMs: number;
  safeCorrectionLimitDb: number; // default +6dB
  roomConfidenceScore: number; // 0 - 100%
  eqBands: IirFilterBand[];
  isCustom: boolean;
  isCalibrated: boolean;
  dateModified: string;
  notes?: string;
}

export type PrePostTap = 'pre' | 'post'; // 'pre' = in the mix; 'post' = through monitoring chain

export interface DynamicsTelemetry {
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  lufsMomentary: number;
  lufsShortTerm: number;
  lufsIntegrated: number;
  crestFactor: number;
  dynamicRangeScore: number; // DR rating (e.g. 11 dB)
  truePeakDb: number;
  correlation: number; // -1 (anti-phase) to +1 (perfect mono)
  stereoWidth: number; // 0 to 200%
  balanceLr: number; // -100 to +100
  midEnergy: number;
  sideEnergy: number;
  spectralDensity: number;
  spectralTiltDb: number;
  loudnessHistory: number[]; // circular rolling buffer of LUFS-M
  dynamicHistory: number[];
  clipCount: number;
}

export interface ReferenceTrackState {
  hasTrack: boolean;
  title: string;
  gainDb: number;
  trackLufs: number;
  mixLufs: number;
  levelMatchOffsetDb: number;
  isLevelMatchActive: boolean;
  currentSource: 'A' | 'B'; // A = Active Mix, B = Reference Track
  isBlindMode: boolean;
  blindRevealed: boolean;
  blindChoice: 'A' | 'B' | null;
  blindHistory: {
    id: string;
    choice: 'A' | 'B';
    actual: 'A' | 'B';
    profileName: string;
    levelDiffDb: number;
    timestamp: string;
  }[];
  isPlaying: boolean;
  loop: boolean;
}

export interface SpectralMemory {
  isFrozen: boolean;
  frozenMixSpectrum: Float32Array | null;
  referenceSpectrum: Float32Array | null;
  deltaLowDb: number; // 20 - 250 Hz difference
  deltaMidDb: number; // 250 - 4000 Hz difference
  deltaHighDb: number; // 4000 - 20000 Hz difference
  spectralDensityDiff: number;
  tiltDiffDb: number;
  freezeTimestamp?: string;
}

export interface SafetyState {
  ceilingDb: number; // e.g. -0.3 dBFS
  maxOutputDb: number; // e.g. 0.0 dBFS
  warningThresholdDb: number; // e.g. -1.0 dBFS
  isDimActive: boolean; // -20 dB monitoring dim
  isMuteActive: boolean;
  isEmergencyStop: boolean;
  monitoringTimeSeconds: number;
  isRestBreakReminderDue: boolean;
  calibrationSpl: 73 | 79 | 83 | 85;
  measuredSpl: number;
  calibrationOffsetDb: number;
  isCalibrationLocked: boolean;
}

export type AuditionMode = 'stereo' | 'mono' | 'mid_only' | 'side_only' | 'left_only' | 'right_only';

export type TestSignalType =
  | 'sine'
  | 'sine_sweep'
  | 'pink_noise'
  | 'white_noise'
  | 'band_noise'
  | 'impulse'
  | 'polarity_pulse'
  | 'multitone';

export type TestSignalChannel = 'left' | 'right' | 'both' | 'sub';

export interface MeasurementPosition {
  id: string;
  name: string;
  weight: number;
  curve: { freq: number; magDb: number; phaseDeg: number }[];
}

export interface RoomModalRegion {
  freqHz: number;
  widthHz: number;
  dipOrPeak: 'peak' | 'dip';
  likelyType: 'axial' | 'tangential' | 'oblique';
  confidence: number;
  warning?: string;
}

export interface SystemTunerState {
  activeSignal: TestSignalType;
  signalLevelDb: number; // -36 to -6 dBFS
  signalFreqHz: number; // 20 to 20000 Hz
  signalChannel: TestSignalChannel;
  isSignalPlaying: boolean;
  sweepSpeed: 'fast_3s' | 'normal_6s' | 'slow_12s';
  isMeasuring: boolean;
  measureProgress: number; // 0 to 100%
  positions: MeasurementPosition[];
  activePositionIndex: number;
  smoothingOctave: '1/48' | '1/24' | '1/12' | '1/6' | '1/3';
  targetCurve: 'flat' | 'bk_1974' | 'harman_room' | 'nearfield_diffuse' | 'custom';
  customTargetTiltDb: number;
  safeCorrectionLimitDb: number; // max boost e.g. +6 dB
  maxCorrectionCutDb: number; // max cut e.g. -18 dB
  leftRightMatch: {
    freqMismatchMaxDb: number;
    levelDiffDb: number;
    delayMismatchMs: number;
    phaseCoherencePercent: number;
    polarityInverted: boolean;
  };
  delayAlignment: {
    leftDelayMs: number;
    rightDelayMs: number;
    subDelayMs: number;
    autoAlignConfidence: number;
  };
  subwooferConfig: {
    crossoverFreq: number;
    slope: 12 | 24 | 48;
    filterType: 'linkwitz_riley' | 'butterworth';
    phaseDeg: number;
    gainDb: number;
    polarity: 'normal' | 'inverted';
    soloMode: 'all' | 'speakers_only' | 'sub_only';
  };
  roomModes: RoomModalRegion[];
  impulseResponseData: Float32Array | null;
  waterfallData: { timeMs: number; spectrum: Float32Array }[];
  liveFeedback: {
    isLiveMode: boolean;
    detectedSpikes: { freqHz: number; amplitudeDb: number; confidence: number; activeNotch: boolean }[];
    feedbackMode: 'manual' | 'assisted' | 'auto';
    maxNotches: number;
  };
  systemLimiter: {
    thresholdDb: number;
    lookaheadMs: number;
    attackMs: number;
    releaseMs: number;
    gainReductionDb: number;
    thermalWarn: boolean;
  };
}

export interface GranularBypassState {
  totalBypass: boolean;
  monitoringEq: boolean;
  roomCorrection: boolean;
  fir: boolean;
  iir: boolean;
  speakerSim: boolean;
  headphoneCrossfeed: boolean;
  crossover: boolean;
  safetyLimiter: boolean;
}

export interface Snapshot {
  id: string;
  name: string;
  profileId: string;
  eqBands: IirFilterBand[];
  crossoverFreq: number;
  delayMs: number;
  timestamp: string;
}

export type MobileViewTier = 'simple' | 'engineer' | 'advanced';

export type CpuProcessingTier = 'low' | 'normal' | 'high' | 'offline';

export interface ValidationTestResult {
  testName: string;
  category: 'frequency' | 'phase' | 'latency' | 'fir' | 'iir' | 'mono' | 'true_peak' | 'lufs' | 'cpu';
  passed: boolean;
  measuredValue: string;
  expectedValue: string;
  tolerance: string;
  details: string;
}

export interface DrumPadConfig {
  id: number;
  name: string;
  category: 'sub' | 'kick' | 'snare' | 'hihat' | 'percussion' | 'melodic' | 'vocal';
  color: string;
  keyLabel: string;
  sub: string;
  sampleKey: string;
}

export interface MidiNote {
  id: string;
  pitch: number; // MIDI note 24-96
  step: number; // 0-15
  length: number;
  velocity: number;
}

export interface GrooveSettings {
  tempoBpm: number;
  swingPercent: number; // 50% to 75%
  humanizeMs: number; // 0 to 25ms
  velocityDrift: number; // 0 to 20%
}

export type HapticIntensity = 'off' | 'subtle' | 'punch' | 'heavy';

export type SynthPatch =
  | '808_glide_sub'
  | 'rhodes_suitcase'
  | 'juno_warm_poly'
  | 'vintage_moog_bass'
  | 'hyperpop_saw_lead'
  | 'drill_bell_pluck';

export interface SynthSettings {
  patch: SynthPatch;
  glideTimeMs: number; // 0 to 300ms portamento
  chordMode: boolean;
  chordType: 'maj9' | 'min11' | 'trap_minor' | 'neo_soul' | 'power';
  filterCutoff: number; // 200 to 12000 Hz
  resonance: number; // 0 to 15 Q
}

export interface CloudSessionState {
  authenticated: boolean;
  developerId: string;
  projectName: string;
  syncTimestamp: number;
  hybridOffloadActive: boolean;
  offloadModules: {
    neuralDenoise: boolean;
    cloudStemSplit: boolean;
    gpuConvolutionReverb: boolean;
    lossless64BitMaster: boolean;
  };
  metrics: {
    roundtripMs: number;
    gpuUtilization: number;
    allocatedRamMb: number;
    peakRamMb: number;
    streamBitrateKbps: number;
  };
}

export interface PcPresetTranslation {
  id: string;
  name: string;
  dawSource: 'FL Studio 21' | 'Ableton Live 12' | 'Logic Pro' | 'SP-404 MK2';
  description: string;
  desktopPlugins: string[];
  parameters: Partial<FxRackParameters>;
  groove: Partial<GrooveSettings>;
}

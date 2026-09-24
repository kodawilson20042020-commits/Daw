/**
 * AURA DSP - Main Audio Engine Controller
 * Multi-threaded AudioWorklet DSP, SharedArrayBuffer bridge, modular 15-plugin hardware registry,
 * Vibration API haptic feedback, polyphonic & sliding synthesizer, and full Sampler DAW suite with infinite banks.
 */

import { AURA_WORKLET_PROCESSOR_CODE } from './dspProcessorCode';
import {
  generateStudioSampleBank,
  SynthesizedSamples,
  reverseAudioBuffer,
  sliceAudioBuffer
} from './sampleSynthesizer';
import { audioBufferToWavBlob, downloadBlob } from './wavEncoder';
import { LiveTrackingController } from './LiveTrackingController';
import { ReferenceLabController } from './ReferenceLabController';
import { SystemTunerController } from './SystemTunerController';
import {
  FxRackParameters,
  VisualizerData,
  GrooveSettings,
  MidiNote,
  PluginType,
  PluginInstance,
  HapticIntensity,
  SynthSettings,
  PadBank,
  PadSampleSettings,
  LoadSampleResult,
  SoundPackExportFormat
} from '../types/audio';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public ctx: AudioContext | null = null;
  public workletNode: AudioWorkletNode | null = null;
  public masterGainNode: GainNode | null = null;
  public liveTracking: LiveTrackingController | null = null;
  public referenceLab: ReferenceLabController | null = null;
  public systemTuner: SystemTunerController | null = null;

  public isInitialized = false;
  public isRunning = false;
  public sampleBank: SynthesizedSamples = {};

  // Custom user sample buffers keyed by pad index
  public customPadBuffers: Record<number, AudioBuffer> = {};
  public padSettings: Record<number, PadSampleSettings> = {};

  // --- INFINITE PAD BANKS ENGINE ---
  public padBanks: PadBank[] = [];
  public activeBankId: string = 'bank_2020s';

  // Modular Plugin Chain (15 Hardware Plugins)
  public activePlugins: PluginInstance[] = [
    { id: 'p_vocal', type: 'vocal_pitch', enabled: true, order: 0 },
    { id: 'p_multiband', type: 'analog_multiband', enabled: true, order: 1 },
    { id: 'p_reverb', type: 'spatial_reverb', enabled: true, order: 2 }
  ];

  // Tactile Haptic Vibration Engine setting
  public hapticIntensity: HapticIntensity = 'punch';

  // Synthesizer State
  public synthSettings: SynthSettings = {
    patch: '808_glide_sub',
    glideTimeMs: 120,
    chordMode: false,
    chordType: 'trap_minor',
    filterCutoff: 3800,
    resonance: 3.5
  };
  private lastMidiPitch: number | null = null;

  // Active sustained voice for continuous glissando / legato piano sliding
  private sustainedVoice: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    filter: BiquadFilterNode;
    gain: GainNode;
    currentPitch: number;
  } | null = null;

  // SharedArrayBuffer / Visualizer bridge
  private sharedBuffer: SharedArrayBuffer | null = null;
  private sharedView: Float32Array | null = null;
  private isSharedBufferSupported = false;
  private visualizerCallbacks: Set<(data: VisualizerData) => void> = new Set();
  private animFrameId: number | null = null;

  private cachedVisualizerData: VisualizerData = {
    spectrum: new Float32Array(32),
    timeDomain: new Float32Array(128),
    peakL: 0,
    peakR: 0,
    correlation: 1.0,
    isSharedArrayBufferActive: false
  };

  // Sequencer & Groove state
  public isSequencerPlaying = false;
  public currentStep = 0;
  private sequenceTimer: number | null = null;
  public grooveSettings: GrooveSettings = {
    tempoBpm: 130,
    swingPercent: 57,
    humanizeMs: 6,
    velocityDrift: 10
  };

  // Drum pattern (16 tracks x 16 steps)
  public drumPattern: boolean[][] = Array.from({ length: 16 }, () => Array(16).fill(false));
  public pianoNotes: MidiNote[] = [];

  // Audio stems for demo
  public isStemLooping = false;
  private stemSources: { vocals?: AudioBufferSourceNode; drums?: AudioBufferSourceNode } = {};
  public vocalStemBuffer: AudioBuffer | null = null;
  public drumStemBuffer: AudioBuffer | null = null;

  // Master DSP parameters (15 plugins)
  public currentParams: FxRackParameters = {
    // 1. Vocal Pitch (2000s Auto-Tune)
    vocalPitchEnabled: true,
    vocalTuneSpeed: 70,
    vocalScale: 'c_harmonic_minor',
    vocalFormantShift: 0,
    vocalHumanizeVibrato: 20,
    vocalWetDry: 70,

    // 2. Analog Multi-Band & Soft Clipper
    compressorEnabled: true,
    compLowGain: 2.5,
    compMidGain: 1.0,
    compHighGain: 2.0,
    tapeWarmthDrive: 45,
    compThreshold: -12,
    compCeilingLimiter: -0.2,
    softClipperEnabled: true,
    compAutoGain: true,

    // 3. Spatial Reverb
    reverbEnabled: true,
    reverbRoomSize: 60,
    reverbDecayTime: 2.0,
    reverbDamping: 40,
    stereoWidth: 125,
    reverbWetDry: 30,

    // 4. SP-404 Lo-Fi Vinyl
    lofiEnabled: false,
    lofiBitDepth: 12,
    lofiSampleRateReduce: 2,
    lofiVinylCrackle: 35,
    lofiWowFlutter: 25,
    lofiFilterFreq: 6500,

    // 5. Transient Shaper
    transientEnabled: false,
    transientAttack: 25,
    transientSustain: -15,
    transientOutputGain: 1.0,

    // 6. Sidechain Pumper
    sidechainEnabled: false,
    sidechainDepth: 70,
    sidechainReleaseMs: 120,
    sidechainRate: '1/4',

    // 7. Dimension Chorus (1980s Roland Dimension D)
    chorusEnabled: false,
    chorusRateHz: 0.8,
    chorusDepth: 70,
    chorusDimensionMode: 2,
    chorusMix: 40,

    // 8. Space Echo & Analog Tape Delay (1970s Roland RE-201)
    delayEnabled: false,
    delayTimeMs: 280,
    delayFeedback: 45,
    delayTapeWarmth: 40,
    delayPingPong: true,
    delayMix: 30,

    // 9. Spectral De-Esser & 20kHz Air EQ (Mäag & Pro-DS)
    deesserEnabled: false,
    deessThreshold: -14,
    deessFrequencyHz: 6800,
    deessAmount: 65,
    airBandGain: 3.5,

    // 10. OTT Upward/Downward Hyper-Compressor (Xfer OTT)
    ottEnabled: false,
    ottDepth: 50,
    ottUpwardGain: 6.0,
    ottDownwardThreshold: -8,
    ottTimeScale: 100,

    // 11. Pultec EQP-1A Tube EQ (1970s Low-End Trick)
    pultecEnabled: false,
    pultecLowFreq: 60,
    pultecBoost: 5.0,
    pultecAtten: 4.0,
    pultecHighBoost: 3.5,

    // 12. SSL 4000 G-Bus Console Glue Compressor (1980s London Glue)
    sslCompEnabled: false,
    sslThreshold: -12,
    sslRatio: 4,
    sslAttackMs: 3.0,
    sslAutoRelease: true,
    sslMakeUpGain: 3.0,

    // 13. Ensoniq ASR-10 Resampling Sampler Grit (1990s Wu-Tang / Kanye)
    asrEnabled: false,
    asrBitDepth: 14,
    asrResampleFreq: 32000,
    asrAnalogWarmth: 50,

    // 14. Pentode Tube Heat Saturator (2010s Trap 808 Saturator)
    tubeHeatEnabled: false,
    tubeDrive: 40,
    tubeBias: 15,
    tubeFatness: 3.0,

    // 15. Dynamic Resonance Suppressor (2020s Soothe2 Harshness Tamer)
    sootheEnabled: false,
    sootheDepth: 55,
    sootheSharpness: 2.5,
    sootheTargetBand: 'high_harsh',

    masterGain: 95
  };

  private constructor() {
    this.setupDefaultPattern();
    this.initDefaultPadBanks();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  // --- INITIALIZE DEFAULT PAD BANKS ACROSS THE DECADES ---
  private initDefaultPadBanks() {
    const defaultSettings: PadSampleSettings = {
      pitchOffsetSemitones: 0,
      fineTuneCents: 0,
      startTrimPercent: 0,
      endTrimPercent: 100,
      isReversed: false,
      oneShot: true,
      volume: 1.0
    };

    this.padBanks = [
      {
        id: 'bank_2020s',
        name: '2020s Drill & Rage',
        era: '2020s',
        padConfigs: [
          { id: 0, name: 'DRILL SLIDE 808', category: 'sub', sub: 'Octave Glide Sub', sampleKey: 'uk_drill_glide_sub', settings: { ...defaultSettings } },
          { id: 1, name: 'PUNCH KICK', category: 'kick', sub: 'Hard Transient', sampleKey: 'punchy_kick', settings: { ...defaultSettings } },
          { id: 2, name: 'CRACK SNARE', category: 'snare', sub: '200Hz Crack', sampleKey: 'crack_snare', settings: { ...defaultSettings } },
          { id: 3, name: 'DRILL HI-HAT', category: 'hihat', sub: 'Triple Rolls', sampleKey: 'closed_hat', settings: { ...defaultSettings } },
          { id: 4, name: 'RAGE BELL', category: 'melodic', sub: 'Hyperpop Lead', sampleKey: 'rage_hyper_bell', settings: { ...defaultSettings } },
          { id: 5, name: 'STUDIO CLAP', category: 'percussion', sub: 'Layered Pop', sampleKey: 'studio_clap', settings: { ...defaultSettings } },
          { id: 6, name: 'TRAP RIM', category: 'percussion', sub: 'Metallic Rim', sampleKey: 'rimshot', settings: { ...defaultSettings } },
          { id: 7, name: '808 COWBELL', category: 'percussion', sub: 'Phonk Bell', sampleKey: 'cowbell', settings: { ...defaultSettings } },
          { id: 8, name: 'SHAKER', category: 'percussion', sub: 'Friction Tap', sampleKey: 'shaker', settings: { ...defaultSettings } },
          { id: 9, name: 'VOCAL CHOP', category: 'vocal', sub: 'Formant Chant', sampleKey: 'vocal_chop', settings: { ...defaultSettings } },
          { id: 10, name: 'SYNTH PLUCK', category: 'melodic', sub: 'Resonant FM', sampleKey: 'synth_pluck', settings: { ...defaultSettings } },
          { id: 11, name: 'OPEN HAT', category: 'hihat', sub: 'Trap Wash', sampleKey: 'open_hat', settings: { ...defaultSettings } },
          { id: 12, name: '808 SUB', category: 'sub', sub: 'Clean 38Hz Drop', sampleKey: '808_sub', settings: { ...defaultSettings } },
          { id: 13, name: 'DIRTY SNARE', category: 'snare', sub: 'SP Vinyl Snare', sampleKey: 'sp1200_dirty_snare', settings: { ...defaultSettings } },
          { id: 14, name: 'SLIDING 808', category: 'sub', sub: 'Drill Pitch Glide', sampleKey: 'drill_sliding_808', settings: { ...defaultSettings } },
          { id: 15, name: 'RHODES 9TH', category: 'melodic', sub: 'Neo-Soul Rhodes', sampleKey: 'rhodes_chord', settings: { ...defaultSettings } }
        ]
      },
      {
        id: 'bank_2010s',
        name: '2010s Metro Trap',
        era: '2010s',
        padConfigs: [
          { id: 0, name: 'SPINZ 808', category: 'sub', sub: 'Atlanta Distorted Sub', sampleKey: 'spinz_808', settings: { ...defaultSettings } },
          { id: 1, name: 'HARD KICK', category: 'kick', sub: 'Wood Beater', sampleKey: 'punchy_kick', settings: { ...defaultSettings } },
          { id: 2, name: 'RACK CITY CLAP', category: 'percussion', sub: 'Stacked Stagger', sampleKey: 'studio_clap', settings: { ...defaultSettings } },
          { id: 3, name: 'PYREX HAT', category: 'hihat', sub: 'Ultra Fast Rolls', sampleKey: 'closed_hat', settings: { ...defaultSettings } },
          { id: 4, name: 'OPEN TRAP HAT', category: 'hihat', sub: 'Sizzle Wash', sampleKey: 'open_hat', settings: { ...defaultSettings } },
          { id: 5, name: 'TRAP SNARE', category: 'snare', sub: 'Crisp Snappy', sampleKey: 'crack_snare', settings: { ...defaultSettings } },
          { id: 6, name: 'TRAP RIM', category: 'percussion', sub: 'Hard Snap', sampleKey: 'rimshot', settings: { ...defaultSettings } },
          { id: 7, name: 'TRAP COWBELL', category: 'percussion', sub: 'Dual Square', sampleKey: 'cowbell', settings: { ...defaultSettings } },
          { id: 8, name: 'SHAKER', category: 'percussion', sub: 'Trap Rolls', sampleKey: 'shaker', settings: { ...defaultSettings } },
          { id: 9, name: 'CHANT VOCAL', category: 'vocal', sub: 'Yeah Chant', sampleKey: 'vocal_chop', settings: { ...defaultSettings } },
          { id: 10, name: 'ZAYTOVEN BELL', category: 'melodic', sub: 'Church Bell', sampleKey: 'rage_hyper_bell', settings: { ...defaultSettings } },
          { id: 11, name: 'RHODES CHORD', category: 'melodic', sub: 'Dark Minor', sampleKey: 'rhodes_chord', settings: { ...defaultSettings } },
          { id: 12, name: '808 SUB BASS', category: 'sub', sub: 'Sub Sine', sampleKey: '808_sub', settings: { ...defaultSettings } },
          { id: 13, name: 'SLIDE 808', category: 'sub', sub: 'Pitch Glide', sampleKey: 'drill_sliding_808', settings: { ...defaultSettings } },
          { id: 14, name: 'SYNTH PLUCK', category: 'melodic', sub: 'Arp Lead', sampleKey: 'synth_pluck', settings: { ...defaultSettings } },
          { id: 15, name: 'BOOMBAP KICK', category: 'kick', sub: 'Low Knock', sampleKey: 'mpc_boombap_kick', settings: { ...defaultSettings } }
        ]
      },
      {
        id: 'bank_90s',
        name: '1990s Boom-Bap & SP',
        era: '90s',
        padConfigs: [
          { id: 0, name: 'MPC60 KICK', category: 'kick', sub: '12-Bit Fat Knock', sampleKey: 'mpc_boombap_kick', settings: { ...defaultSettings } },
          { id: 1, name: 'SP1200 SNARE', category: 'snare', sub: 'Dirty Vinyl Ring', sampleKey: 'sp1200_dirty_snare', settings: { ...defaultSettings } },
          { id: 2, name: 'VINYL HAT', category: 'hihat', sub: 'Dust Sheen', sampleKey: 'closed_hat', settings: { ...defaultSettings } },
          { id: 3, name: 'OPEN DUST HAT', category: 'hihat', sub: 'Tape Wash', sampleKey: 'open_hat', settings: { ...defaultSettings } },
          { id: 4, name: 'JAZZ UPRIGHT', category: 'sub', sub: 'Filtered Bassline', sampleKey: '90s_jazz_upright', settings: { ...defaultSettings } },
          { id: 5, name: 'BOOMBAP CLAP', category: 'percussion', sub: 'Raw Handclap', sampleKey: 'studio_clap', settings: { ...defaultSettings } },
          { id: 6, name: 'WOOD RIM', category: 'percussion', sub: 'Snare Rim', sampleKey: 'rimshot', settings: { ...defaultSettings } },
          { id: 7, name: 'VINYL SHAKER', category: 'percussion', sub: 'Funk Friction', sampleKey: 'shaker', settings: { ...defaultSettings } },
          { id: 8, name: 'WARM SUB BASS', category: 'sub', sub: 'Analog Filtered', sampleKey: '808_sub', settings: { ...defaultSettings } },
          { id: 9, name: 'SOUL CHOP', category: 'vocal', sub: 'Sampled Vocal', sampleKey: 'vocal_chop', settings: { ...defaultSettings } },
          { id: 10, name: 'SUITCASE RHODES', category: 'melodic', sub: '70s Tremolo Keys', sampleKey: 'rhodes_chord', settings: { ...defaultSettings } },
          { id: 11, name: '70s COWBELL', category: 'percussion', sub: 'Brass Thump', sampleKey: 'cowbell', settings: { ...defaultSettings } },
          { id: 12, name: 'PUNCH KICK', category: 'kick', sub: 'Acoustic Thud', sampleKey: 'punchy_kick', settings: { ...defaultSettings } },
          { id: 13, name: 'CRACK SNARE', category: 'snare', sub: '185Hz Snap', sampleKey: 'crack_snare', settings: { ...defaultSettings } },
          { id: 14, name: 'SYNTH PLUCK', category: 'melodic', sub: 'Analog Resonant', sampleKey: 'synth_pluck', settings: { ...defaultSettings } },
          { id: 15, name: 'SLIDING 808', category: 'sub', sub: 'Sub Drop', sampleKey: 'drill_sliding_808', settings: { ...defaultSettings } }
        ]
      },
      {
        id: 'bank_80s',
        name: '1980s Miami & Electro',
        era: '80s',
        padConfigs: [
          { id: 0, name: '808 BOOM SUB', category: 'sub', sub: 'Vintage Roland Sub', sampleKey: '808_sub', settings: { ...defaultSettings } },
          { id: 1, name: '808 KICK', category: 'kick', sub: 'Punchy Beater', sampleKey: 'punchy_kick', settings: { ...defaultSettings } },
          { id: 2, name: 'LINNDRUM CLAP', category: 'percussion', sub: 'Gated Prince Clap', sampleKey: '80s_linndrum_clap', settings: { ...defaultSettings } },
          { id: 3, name: '808 METALLIC HAT', category: 'hihat', sub: '6-Osc Sizzle', sampleKey: 'closed_hat', settings: { ...defaultSettings } },
          { id: 4, name: '808 OPEN HAT', category: 'hihat', sub: 'Long Decay', sampleKey: 'open_hat', settings: { ...defaultSettings } },
          { id: 5, name: 'DX7 SOLID BASS', category: 'sub', sub: 'Yamaha FM Bass', sampleKey: '80s_dx7_bass', settings: { ...defaultSettings } },
          { id: 6, name: '808 COWBELL', category: 'percussion', sub: 'Classic Cowbell', sampleKey: 'cowbell', settings: { ...defaultSettings } },
          { id: 7, name: '808 CRACK SNARE', category: 'snare', sub: 'High Tone Snap', sampleKey: 'crack_snare', settings: { ...defaultSettings } },
          { id: 8, name: 'WOOD RIM', category: 'percussion', sub: 'Tight Click', sampleKey: 'rimshot', settings: { ...defaultSettings } },
          { id: 9, name: 'VOCAL CHOP', category: 'vocal', sub: 'Synth Vox', sampleKey: 'vocal_chop', settings: { ...defaultSettings } },
          { id: 10, name: 'CHORUS RHODES', category: 'melodic', sub: 'Analog Warmth', sampleKey: 'rhodes_chord', settings: { ...defaultSettings } },
          { id: 11, name: 'FM BELL PLUCK', category: 'melodic', sub: 'Shimmer Lead', sampleKey: 'rage_hyper_bell', settings: { ...defaultSettings } },
          { id: 12, name: 'SHAKER', category: 'percussion', sub: 'Analog Friction', sampleKey: 'shaker', settings: { ...defaultSettings } },
          { id: 13, name: 'SP1200 SNARE', category: 'snare', sub: '12-Bit Ring', sampleKey: 'sp1200_dirty_snare', settings: { ...defaultSettings } },
          { id: 14, name: 'SLIDE SUB', category: 'sub', sub: 'Pitch Glide', sampleKey: 'drill_sliding_808', settings: { ...defaultSettings } },
          { id: 15, name: 'SYNTH PLUCK', category: 'melodic', sub: 'Analog Stabs', sampleKey: 'synth_pluck', settings: { ...defaultSettings } }
        ]
      },
      {
        id: 'bank_70s',
        name: '1970s Funk & Soul Breaks',
        era: '70s',
        padConfigs: [
          { id: 0, name: 'FUNK BREAK KICK', category: 'kick', sub: 'Live Acoustic Break', sampleKey: '70s_funk_break', settings: { ...defaultSettings } },
          { id: 1, name: 'MOTOWN SNARE', category: 'snare', sub: 'Tea-Towel Snare', sampleKey: '70s_motown_snare', settings: { ...defaultSettings } },
          { id: 2, name: 'WOOD CLAVE', category: 'percussion', sub: 'Acoustic Wood', sampleKey: '2000s_wood_clave', settings: { ...defaultSettings } },
          { id: 3, name: 'ACOUSTIC HAT', category: 'hihat', sub: 'Zildjian Crisp', sampleKey: 'closed_hat', settings: { ...defaultSettings } },
          { id: 4, name: 'OPEN SOUL HAT', category: 'hihat', sub: 'Wash Sizzle', sampleKey: 'open_hat', settings: { ...defaultSettings } },
          { id: 5, name: 'HAND CLAP', category: 'percussion', sub: 'Natural Hands', sampleKey: 'studio_clap', settings: { ...defaultSettings } },
          { id: 6, name: 'SOUL RIMSHOT', category: 'percussion', sub: 'Warm Maple Rim', sampleKey: 'rimshot', settings: { ...defaultSettings } },
          { id: 7, name: 'BRASS COWBELL', category: 'percussion', sub: 'Latin Thump', sampleKey: 'cowbell', settings: { ...defaultSettings } },
          { id: 8, name: 'SHAKER EGG', category: 'percussion', sub: 'Groove Friction', sampleKey: 'shaker', settings: { ...defaultSettings } },
          { id: 9, name: 'SOUL VOCAL', category: 'vocal', sub: 'Vintage Chant', sampleKey: 'vocal_chop', settings: { ...defaultSettings } },
          { id: 10, name: 'SUITCASE RHODES', category: 'melodic', sub: '73 Keys Tremolo', sampleKey: 'rhodes_chord', settings: { ...defaultSettings } },
          { id: 11, name: 'JAZZ UPRIGHT', category: 'sub', sub: 'Wood Bass Pluck', sampleKey: '90s_jazz_upright', settings: { ...defaultSettings } },
          { id: 12, name: 'WARM SUB', category: 'sub', sub: 'Tube Filtered', sampleKey: '808_sub', settings: { ...defaultSettings } },
          { id: 13, name: 'CRACK SNARE', category: 'snare', sub: 'Snappy Thud', sampleKey: 'crack_snare', settings: { ...defaultSettings } },
          { id: 14, name: 'SYNTH PLUCK', category: 'melodic', sub: 'Moog Pluck', sampleKey: 'synth_pluck', settings: { ...defaultSettings } },
          { id: 15, name: 'GLIDE SUB', category: 'sub', sub: 'Bass Drop', sampleKey: 'drill_sliding_808', settings: { ...defaultSettings } }
        ]
      }
    ];
  }

  // --- BANK MANAGEMENT ---
  public getActiveBank(): PadBank {
    return this.padBanks.find((b) => b.id === this.activeBankId) || this.padBanks[0];
  }

  public switchBank(bankId: string) {
    const found = this.padBanks.find((b) => b.id === bankId);
    if (found) {
      this.activeBankId = bankId;
    }
  }

  public createCustomBank(name: string, era: any = 'custom'): PadBank {
    const defaultSettings: PadSampleSettings = {
      pitchOffsetSemitones: 0,
      fineTuneCents: 0,
      startTrimPercent: 0,
      endTrimPercent: 100,
      isReversed: false,
      oneShot: true,
      volume: 1.0
    };

    const newBank: PadBank = {
      id: `bank_${Date.now()}`,
      name: name || `Bank ${String.fromCharCode(65 + this.padBanks.length)}`,
      era: era,
      padConfigs: Array.from({ length: 16 }, (_, i) => ({
        id: i,
        name: `PAD ${i + 1}`,
        category: (i === 0 ? 'sub' : i === 1 ? 'kick' : i === 2 ? 'snare' : i === 3 ? 'hihat' : 'percussion') as any,
        sub: 'User Sample',
        sampleKey: 'punchy_kick',
        settings: { ...defaultSettings }
      }))
    };

    this.padBanks.push(newBank);
    this.activeBankId = newBank.id;
    return newBank;
  }

  public deleteBank(bankId: string) {
    if (this.padBanks.length <= 1) return;
    this.padBanks = this.padBanks.filter((b) => b.id !== bankId);
    if (this.activeBankId === bankId) {
      this.activeBankId = this.padBanks[0].id;
    }
  }

  // --- SAMPLE INGESTION: URL, PRESET, FILE, MIC ---
  public async loadPresetSample(sampleKey: string, targetPadIndex: number = 0): Promise<LoadSampleResult> {
    await this.initAudio();
    if (!this.ctx) {
      return { success: false, error: 'AudioContext is not ready. Please tap the screen to activate audio.' };
    }

    if (!this.sampleBank || Object.keys(this.sampleBank).length === 0) {
      this.sampleBank = generateStudioSampleBank(this.ctx);
    }

    const buffer = this.sampleBank[sampleKey];
    if (!buffer) {
      return { success: false, error: `Preset "${sampleKey}" was not found in the studio sample bank.` };
    }

    this.customPadBuffers[targetPadIndex] = buffer;

    const cleanName = sampleKey.replace(/_/g, ' ').toUpperCase().slice(0, 14);
    const bank = this.getActiveBank();
    if (bank && bank.padConfigs[targetPadIndex]) {
      bank.padConfigs[targetPadIndex].name = cleanName;
      bank.padConfigs[targetPadIndex].sub = `${buffer.duration.toFixed(2)}s Studio`;
      bank.padConfigs[targetPadIndex].sampleKey = sampleKey;
    }

    return {
      success: true,
      sampleName: cleanName,
      duration: buffer.duration
    };
  }

  public async loadSampleFromUrl(url: string, targetPadIndex: number = 0): Promise<LoadSampleResult> {
    await this.initAudio();
    if (!this.ctx) {
      return { success: false, error: 'AudioContext is not initialized. Please click anywhere to activate audio.' };
    }

    let trimmed = (url || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter a valid audio URL or choose a sample preset.' };
    }

    // Ensure studio sample bank is generated
    if (!this.sampleBank || Object.keys(this.sampleBank).length === 0) {
      this.sampleBank = generateStudioSampleBank(this.ctx);
    }

    // Check if the input is a preset identifier (e.g. "punchy_kick" or "preset:808_sub")
    const presetCandidate = trimmed.replace(/^preset:/i, '').toLowerCase();
    if (this.sampleBank && this.sampleBank[presetCandidate]) {
      return this.loadPresetSample(presetCandidate, targetPadIndex);
    }

    // Detect video/streaming sites that cannot provide raw audio in-browser
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('youtube.com') ||
      lower.includes('youtu.be') ||
      lower.includes('soundcloud.com') ||
      lower.includes('spotify.com') ||
      lower.includes('tiktok.com')
    ) {
      return {
        success: false,
        error:
          'Streaming platforms (YouTube, SoundCloud, Spotify) serve DRM/web pages rather than direct raw audio files. Please use a direct .wav, .mp3, or .ogg link, upload an audio file, or select a studio sample preset below.'
      };
    }

    // Auto-prefix protocol if missing and not data/blob
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:') && !trimmed.startsWith('blob:')) {
      trimmed = 'https://' + trimmed;
    }

    let arrayBuffer: ArrayBuffer | null = null;
    let failureDetail = '';

    // Step 1: Direct fetch with CORS
    try {
      const response = await fetch(trimmed, { mode: 'cors' });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          return {
            success: false,
            error: 'The provided URL returned a webpage (HTML) rather than an audio file. Ensure the URL links directly to an audio file (.mp3, .wav, .ogg).'
          };
        }
        arrayBuffer = await response.arrayBuffer();
      } else {
        failureDetail = `Host returned HTTP ${response.status} (${response.statusText || 'Error'})`;
      }
    } catch (directErr: any) {
      failureDetail = directErr?.message || 'CORS or network restriction';
    }

    // Step 2: Fallback to server audio proxy if direct fetch failed
    if (!arrayBuffer && !trimmed.startsWith('data:') && !trimmed.startsWith('blob:')) {
      try {
        const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(trimmed)}`;
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
          arrayBuffer = await proxyRes.arrayBuffer();
        } else {
          const errJson = await proxyRes.json().catch(() => null);
          if (errJson?.error) {
            failureDetail = errJson.error;
          }
        }
      } catch {
        // Proxy not reachable or failed
      }
    }

    if (!arrayBuffer) {
      return {
        success: false,
        error: `Could not load sample: ${failureDetail || 'Failed to fetch audio data'}. Please verify the host allows cross-origin requests, or upload the audio file directly.`
      };
    }

    // Step 3: Decode audio data
    try {
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.customPadBuffers[targetPadIndex] = audioBuffer;

      // Extract a clean display name
      let cleanName = 'URL SAMPLE';
      try {
        const parsed = new URL(trimmed);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          const last = decodeURIComponent(segments[segments.length - 1]);
          cleanName = last.replace(/\.[^/.]+$/, '').slice(0, 14).toUpperCase();
        }
      } catch {
        cleanName = 'URL SAMPLE';
      }

      const bank = this.getActiveBank();
      if (bank && bank.padConfigs[targetPadIndex]) {
        bank.padConfigs[targetPadIndex].name = cleanName || 'URL SAMPLE';
        bank.padConfigs[targetPadIndex].sub = `${audioBuffer.duration.toFixed(1)}s Custom`;
      }

      return {
        success: true,
        sampleName: cleanName,
        duration: audioBuffer.duration
      };
    } catch {
      return {
        success: false,
        error: 'Fetched data could not be decoded as audio. Supported formats: WAV, MP3, OGG, AAC, FLAC.'
      };
    }
  }

  public async loadSampleFromFile(file: File, targetPadIndex: number = 0): Promise<LoadSampleResult> {
    await this.initAudio();
    if (!this.ctx) {
      return { success: false, error: 'AudioContext is not initialized. Please click anywhere to activate audio.' };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.customPadBuffers[targetPadIndex] = audioBuffer;

      const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 14).toUpperCase();
      const bank = this.getActiveBank();
      if (bank && bank.padConfigs[targetPadIndex]) {
        bank.padConfigs[targetPadIndex].name = cleanName;
        bank.padConfigs[targetPadIndex].sub = `${audioBuffer.duration.toFixed(1)}s Audio`;
      }

      return {
        success: true,
        sampleName: cleanName,
        duration: audioBuffer.duration
      };
    } catch {
      return {
        success: false,
        error: `Could not decode "${file.name}". Please ensure it is a valid audio file (WAV, MP3, OGG).`
      };
    }
  }

  public async recordMicSample(durationSec: number = 2.0, targetPadIndex: number = 0): Promise<LoadSampleResult> {
    await this.initAudio();
    if (!this.ctx) {
      return { success: false, error: 'AudioContext is not initialized.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      return new Promise<LoadSampleResult>((resolve) => {
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const arrayBuf = await blob.arrayBuffer();
          if (this.ctx) {
            try {
              const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
              this.customPadBuffers[targetPadIndex] = audioBuf;

              const bank = this.getActiveBank();
              if (bank && bank.padConfigs[targetPadIndex]) {
                bank.padConfigs[targetPadIndex].name = 'MIC RECORD';
                bank.padConfigs[targetPadIndex].sub = `${audioBuf.duration.toFixed(1)}s Live`;
              }
              resolve({
                success: true,
                sampleName: 'MIC RECORD',
                duration: audioBuf.duration
              });
            } catch {
              resolve({ success: false, error: 'Failed to decode recorded microphone audio.' });
            }
          } else {
            resolve({ success: false, error: 'AudioContext lost during recording.' });
          }
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, durationSec * 1000);
      });
    } catch {
      return { success: false, error: 'Microphone permission denied or audio device not found.' };
    }
  }

  // --- 16-LEVELS MELODIC CHROMATIC PITCH MAPPING ---
  public apply16Levels(sourcePadIndex: number) {
    const bank = this.getActiveBank();
    const sourceCfg = bank.padConfigs[sourcePadIndex];
    if (!sourceCfg) return;

    const sourceBuffer = this.customPadBuffers[sourcePadIndex] || this.sampleBank[sourceCfg.sampleKey];
    if (!sourceBuffer) return;

    // Map the source sample across all 16 pads at chromatic semitones (-8 to +7)
    for (let i = 0; i < 16; i++) {
      const semitoneOffset = i - 8;
      this.customPadBuffers[i] = sourceBuffer;

      const sign = semitoneOffset >= 0 ? `+${semitoneOffset}` : `${semitoneOffset}`;
      bank.padConfigs[i].name = `${sourceCfg.name.slice(0, 8)} ${sign}`;
      bank.padConfigs[i].sub = `Pitch ${sign} st`;
      bank.padConfigs[i].settings = {
        ...sourceCfg.settings,
        pitchOffsetSemitones: semitoneOffset
      };
    }
  }

  // --- SOUND PACK EXPORT FOR FL STUDIO, BANDLAB, GARAGEBAND ---
  public async exportSoundPack(format: SoundPackExportFormat = 'fl_studio') {
    const bank = this.getActiveBank();
    const packName = `AURA_${bank.name.replace(/\s+/g, '_')}_Kit`;

    if (format === 'fl_studio') {
      // FL Studio FPC Kit Manifest
      const fpcData = {
        app: 'AURA DSP FL Studio FPC Preset Translator',
        presetName: bank.name,
        era: bank.era,
        tempo: this.grooveSettings.tempoBpm,
        swing: this.grooveSettings.swingPercent,
        pads: bank.padConfigs.map((pad, idx) => ({
          padNumber: idx + 1,
          name: pad.name,
          category: pad.category,
          pitchSemitones: pad.settings.pitchOffsetSemitones,
          fineTune: pad.settings.fineTuneCents,
          reverse: pad.settings.isReversed,
          sampleRate: 48000,
          pan: 0,
          volume: pad.settings.volume
        }))
      };

      const blob = new Blob([JSON.stringify(fpcData, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${packName}_FL_Studio_FPC.json`);
    } else if (format === 'bandlab') {
      // BandLab Sampler Kit
      const bandLabData = {
        version: '1.0',
        title: bank.name,
        creator: 'AURA DSP Mobile Studio',
        kitType: 'sampler',
        tracks: bank.padConfigs.map((pad, idx) => ({
          padIndex: idx,
          label: pad.name,
          color: '#06b6d4',
          sampleRef: `${pad.name.toLowerCase().replace(/\s+/g, '_')}.wav`,
          tuning: pad.settings.pitchOffsetSemitones
        }))
      };
      const blob = new Blob([JSON.stringify(bandLabData, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${packName}_BandLab_Kit.json`);
    } else {
      // GarageBand / Logic Drum Machine Designer Kit
      const garageBandData = {
        format: 'Apple Drum Machine Designer',
        kitName: bank.name,
        subCategory: 'Hip-Hop / Rap & Pop',
        pads: bank.padConfigs.map((pad, idx) => ({
          noteNumber: 36 + idx, // GM Drum mapping starts at C1 (36)
          name: pad.name,
          category: pad.category,
          pitchOffset: pad.settings.pitchOffsetSemitones,
          reverse: pad.settings.isReversed
        }))
      };
      const blob = new Blob([JSON.stringify(garageBandData, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${packName}_GarageBand_DMD.json`);
    }
  }

  public async initAudio(): Promise<boolean> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.isRunning = this.ctx.state === 'running';
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: 48000
      });

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.sampleBank = generateStudioSampleBank(this.ctx);
      this.generateDemoStems();

      const blob = new Blob([AURA_WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      this.workletNode = new AudioWorkletNode(this.ctx, 'aura-dsp-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });

      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = 0.95;

      this.workletNode.connect(this.masterGainNode);

      // Initialize Reference Lab Monitoring Signal Path & System Tuner
      this.referenceLab = new ReferenceLabController(this.ctx, this.masterGainNode);
      this.systemTuner = new SystemTunerController(this.ctx);

      this.liveTracking = new LiveTrackingController(this.ctx, this.workletNode);

      this.setupVisualizerBridge();
      this.applyAllParams();

      this.isInitialized = true;
      this.isRunning = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize AURA DSP Engine:', err);
      return false;
    }
  }

  // --- VIBRATION API HAPTIC PULSE ENGINE ---
  public triggerHaptic(category: 'sub' | 'kick' | 'snare' | 'hihat' | 'percussion' | 'melodic' | 'vocal' = 'kick') {
    if (this.hapticIntensity === 'off') return;
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

    try {
      if (this.hapticIntensity === 'subtle') {
        navigator.vibrate(10);
        return;
      }

      if (category === 'sub' || category === 'kick') {
        if (this.hapticIntensity === 'heavy') {
          navigator.vibrate([40, 15, 30]); // Deep double thud for 808
        } else {
          navigator.vibrate(28); // Punchy kick
        }
      } else if (category === 'snare' || category === 'percussion') {
        navigator.vibrate(18); // Crisp snare snap
      } else {
        navigator.vibrate(8); // Feather-light tick for hats & chops
      }
    } catch {
      // Ignore vibration errors on non-supported platforms
    }
  }

  // --- MODULAR PLUGIN CHAIN MANAGEMENT ---
  public isPluginActive(type: PluginType): boolean {
    return this.activePlugins.some((p) => p.type === type && p.enabled);
  }

  public activatePlugin(type: PluginType) {
    const existing = this.activePlugins.find((p) => p.type === type);
    if (existing) {
      existing.enabled = true;
    } else {
      this.activePlugins.push({
        id: `plugin_${type}_${Date.now()}`,
        type,
        enabled: true,
        order: this.activePlugins.length
      });
    }

    this.syncPluginStateToDsp(type, true);
  }

  public removePlugin(type: PluginType) {
    this.activePlugins = this.activePlugins.filter((p) => p.type !== type);
    this.syncPluginStateToDsp(type, false);
  }

  public togglePluginBypass(type: PluginType) {
    const plug = this.activePlugins.find((p) => p.type === type);
    if (!plug) return;
    plug.enabled = !plug.enabled;
    this.syncPluginStateToDsp(type, plug.enabled);
  }

  private syncPluginStateToDsp(type: PluginType, active: boolean) {
    switch (type) {
      case 'vocal_pitch':
        this.updateParam('vocalPitchEnabled', active);
        break;
      case 'analog_multiband':
        this.updateParam('compressorEnabled', active);
        break;
      case 'spatial_reverb':
        this.updateParam('reverbEnabled', active);
        break;
      case 'sp404_lofi':
        this.updateParam('lofiEnabled', active);
        break;
      case 'transient_shaper':
        this.updateParam('transientEnabled', active);
        break;
      case 'sidechain_pumper':
        this.updateParam('sidechainEnabled', active);
        break;
      case 'dimension_chorus':
        this.updateParam('chorusEnabled', active);
        break;
      case 'tape_delay':
        this.updateParam('delayEnabled', active);
        break;
      case 'spectral_deesser':
        this.updateParam('deesserEnabled', active);
        break;
      case 'hyper_ott':
        this.updateParam('ottEnabled', active);
        break;
      case 'pultec_eq':
        this.updateParam('pultecEnabled', active);
        break;
      case 'ssl_bus_comp':
        this.updateParam('sslCompEnabled', active);
        break;
      case 'asr10_sampler_grit':
        this.updateParam('asrEnabled', active);
        break;
      case 'tube_heat':
        this.updateParam('tubeHeatEnabled', active);
        break;
      case 'resonance_suppressor':
        this.updateParam('sootheEnabled', active);
        break;
    }
  }

  private setupVisualizerBridge() {
    if (!this.workletNode) return;

    if (typeof SharedArrayBuffer !== 'undefined' && (window as any).crossOriginIsolated) {
      try {
        this.sharedBuffer = new SharedArrayBuffer(163 * Float32Array.BYTES_PER_ELEMENT);
        this.sharedView = new Float32Array(this.sharedBuffer);
        this.isSharedBufferSupported = true;

        this.workletNode.port.postMessage({
          type: 'SET_SHARED_BUFFER',
          buffer: this.sharedBuffer
        });
      } catch {
        this.isSharedBufferSupported = false;
      }
    }

    this.workletNode.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'SPECTRUM_TICK') {
        this.cachedVisualizerData.peakL = data.peakL;
        this.cachedVisualizerData.peakR = data.peakR;
        this.cachedVisualizerData.correlation = data.correlation;
        if (data.spectrum) {
          for (let i = 0; i < 32; i++) {
            this.cachedVisualizerData.spectrum[i] = data.spectrum[i] || 0;
          }
        }
        if (data.waveform) {
          for (let i = 0; i < 128; i++) {
            this.cachedVisualizerData.timeDomain[i] = data.waveform[i] || 0;
          }
        }
      }
    };

    this.startVisualizerLoop();
  }

  private startVisualizerLoop() {
    const loop = () => {
      if (this.isSharedBufferSupported && this.sharedView) {
        this.cachedVisualizerData.peakL = this.sharedView[0];
        this.cachedVisualizerData.peakR = this.sharedView[1];
        this.cachedVisualizerData.correlation = this.sharedView[2];
        for (let i = 0; i < 32; i++) {
          this.cachedVisualizerData.spectrum[i] = this.sharedView[3 + i];
        }
        for (let i = 0; i < 128; i++) {
          this.cachedVisualizerData.timeDomain[i] = this.sharedView[35 + i];
        }
        this.cachedVisualizerData.isSharedArrayBufferActive = true;
      } else {
        this.cachedVisualizerData.isSharedArrayBufferActive = false;
      }

      this.visualizerCallbacks.forEach((cb) => cb(this.cachedVisualizerData));
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public subscribeVisualizer(callback: (data: VisualizerData) => void): () => void {
    this.visualizerCallbacks.add(callback);
    return () => this.visualizerCallbacks.delete(callback);
  }

  // --- PARAMETER SYNCHRONIZATION ---
  public updateParam<K extends keyof FxRackParameters>(key: K, value: FxRackParameters[K]) {
    this.currentParams[key] = value;
    if (!this.workletNode) return;

    let scaledValue: number = typeof value === 'boolean' ? (value ? 1 : 0) : (value as number);

    switch (key) {
      case 'vocalTuneSpeed':
      case 'vocalHumanizeVibrato':
      case 'vocalWetDry':
      case 'tapeWarmthDrive':
      case 'reverbRoomSize':
      case 'reverbDamping':
      case 'reverbWetDry':
      case 'lofiVinylCrackle':
      case 'lofiWowFlutter':
      case 'transientAttack':
      case 'transientSustain':
      case 'sidechainDepth':
      case 'chorusDepth':
      case 'chorusMix':
      case 'delayFeedback':
      case 'delayTapeWarmth':
      case 'delayMix':
      case 'deessAmount':
      case 'ottDepth':
      case 'asrAnalogWarmth':
      case 'tubeDrive':
      case 'tubeBias':
      case 'sootheDepth':
        scaledValue = (value as number) / 100.0;
        break;

      case 'compLowGain':
      case 'compMidGain':
      case 'compHighGain':
        scaledValue = Math.pow(10, (value as number) / 20.0);
        break;

      case 'compThreshold':
      case 'compCeilingLimiter':
      case 'deessThreshold':
      case 'ottDownwardThreshold':
        scaledValue = Math.pow(10, (value as number) / 20.0);
        break;

      case 'stereoWidth':
      case 'ottTimeScale':
      case 'masterGain':
        scaledValue = (value as number) / 100.0;
        break;

      case 'sootheTargetBand':
        scaledValue = (value as string) === 'high_harsh' ? 1 : (value as string) === 'mid_box' ? 2 : 3;
        break;
    }

    this.workletNode.port.postMessage({
      type: 'SET_PARAM',
      key,
      value: scaledValue
    });
  }

  public applyAllParams() {
    if (!this.workletNode) return;

    const p = this.currentParams;
    this.workletNode.port.postMessage({
      type: 'BATCH_PARAMS',
      params: {
        vocalPitchEnabled: p.vocalPitchEnabled ? 1 : 0,
        vocalTuneSpeed: p.vocalTuneSpeed / 100.0,
        vocalFormantShift: p.vocalFormantShift,
        vocalHumanizeVibrato: p.vocalHumanizeVibrato / 100.0,
        vocalWetDry: p.vocalWetDry / 100.0,
        compressorEnabled: p.compressorEnabled ? 1 : 0,
        compLowGain: Math.pow(10, p.compLowGain / 20.0),
        compMidGain: Math.pow(10, p.compMidGain / 20.0),
        compHighGain: Math.pow(10, p.compHighGain / 20.0),
        tapeWarmthDrive: p.tapeWarmthDrive / 100.0,
        compThreshold: Math.pow(10, p.compThreshold / 20.0),
        compCeilingLimiter: Math.pow(10, p.compCeilingLimiter / 20.0),
        softClipperEnabled: p.softClipperEnabled ? 1 : 0,
        reverbEnabled: p.reverbEnabled ? 1 : 0,
        reverbRoomSize: p.reverbRoomSize / 100.0,
        reverbDecayTime: p.reverbDecayTime,
        reverbDamping: p.reverbDamping / 100.0,
        stereoWidth: p.stereoWidth / 100.0,
        reverbWetDry: p.reverbWetDry / 100.0,
        lofiEnabled: p.lofiEnabled ? 1 : 0,
        lofiBitDepth: p.lofiBitDepth,
        lofiSampleRateReduce: p.lofiSampleRateReduce,
        lofiVinylCrackle: p.lofiVinylCrackle / 100.0,
        lofiWowFlutter: p.lofiWowFlutter / 100.0,
        lofiFilterFreq: p.lofiFilterFreq,
        transientEnabled: p.transientEnabled ? 1 : 0,
        transientAttack: p.transientAttack / 100.0,
        transientSustain: p.transientSustain / 100.0,
        transientOutputGain: p.transientOutputGain,
        sidechainEnabled: p.sidechainEnabled ? 1 : 0,
        sidechainDepth: p.sidechainDepth / 100.0,
        sidechainReleaseMs: p.sidechainReleaseMs,
        chorusEnabled: p.chorusEnabled ? 1 : 0,
        chorusRateHz: p.chorusRateHz,
        chorusDepth: p.chorusDepth / 100.0,
        chorusDimensionMode: p.chorusDimensionMode,
        chorusMix: p.chorusMix / 100.0,
        delayEnabled: p.delayEnabled ? 1 : 0,
        delayTimeMs: p.delayTimeMs,
        delayFeedback: p.delayFeedback / 100.0,
        delayTapeWarmth: p.delayTapeWarmth / 100.0,
        delayPingPong: p.delayPingPong ? 1 : 0,
        delayMix: p.delayMix / 100.0,
        deesserEnabled: p.deesserEnabled ? 1 : 0,
        deessThreshold: Math.pow(10, p.deessThreshold / 20.0),
        deessFrequencyHz: p.deessFrequencyHz,
        deessAmount: p.deessAmount / 100.0,
        airBandGain: p.airBandGain,
        ottEnabled: p.ottEnabled ? 1 : 0,
        ottDepth: p.ottDepth / 100.0,
        ottUpwardGain: p.ottUpwardGain,
        ottDownwardThreshold: Math.pow(10, p.ottDownwardThreshold / 20.0),
        ottTimeScale: p.ottTimeScale / 100.0,
        pultecEnabled: p.pultecEnabled ? 1 : 0,
        pultecLowFreq: p.pultecLowFreq,
        pultecBoost: p.pultecBoost,
        pultecAtten: p.pultecAtten,
        pultecHighBoost: p.pultecHighBoost,
        sslCompEnabled: p.sslCompEnabled ? 1 : 0,
        sslThreshold: p.sslThreshold,
        sslRatio: p.sslRatio,
        sslAttackMs: p.sslAttackMs,
        sslAutoRelease: p.sslAutoRelease ? 1 : 0,
        sslMakeUpGain: p.sslMakeUpGain,
        asrEnabled: p.asrEnabled ? 1 : 0,
        asrBitDepth: p.asrBitDepth,
        asrResampleFreq: p.asrResampleFreq,
        asrAnalogWarmth: p.asrAnalogWarmth / 100.0,
        tubeHeatEnabled: p.tubeHeatEnabled ? 1 : 0,
        tubeDrive: p.tubeDrive / 100.0,
        tubeBias: p.tubeBias / 100.0,
        tubeFatness: p.tubeFatness,
        sootheEnabled: p.sootheEnabled ? 1 : 0,
        sootheDepth: p.sootheDepth / 100.0,
        sootheSharpness: p.sootheSharpness,
        sootheTargetBand: p.sootheTargetBand === 'high_harsh' ? 1 : p.sootheTargetBand === 'mid_box' ? 2 : 3,
        masterGain: p.masterGain / 100.0
      }
    });
  }

  // --- DRUM PAD TRIGGERING WITH SAMPLE TRIMMING, REVERSE & PITCH ---
  public triggerPad(padIndex: number, velocity: number = 0.9) {
    if (!this.ctx || !this.workletNode) return;

    const bank = this.getActiveBank();
    const padCfg = bank.padConfigs[padIndex];
    const settings = padCfg?.settings || {
      pitchOffsetSemitones: 0,
      fineTuneCents: 0,
      startTrimPercent: 0,
      endTrimPercent: 100,
      isReversed: false,
      oneShot: true,
      volume: 1.0
    };

    let buffer: AudioBuffer | null = this.customPadBuffers[padIndex] || null;
    if (!buffer && padCfg) {
      buffer = this.sampleBank[padCfg.sampleKey] || this.sampleBank['punchy_kick'];
    }
    if (!buffer) return;

    // Apply reverse if configured
    let playBuffer = buffer;
    if (settings.isReversed) {
      playBuffer = reverseAudioBuffer(this.ctx, buffer);
    }

    // Apply start / end trim if needed
    if (settings.startTrimPercent > 0 || settings.endTrimPercent < 100) {
      playBuffer = sliceAudioBuffer(this.ctx, playBuffer, settings.startTrimPercent, settings.endTrimPercent);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = playBuffer;

    // Pitch transposition: Math.pow(2, semitones / 12)
    const totalSemitones = (settings.pitchOffsetSemitones || 0) + (settings.fineTuneCents || 0) / 100.0;
    source.playbackRate.value = Math.max(0.125, Math.min(8.0, Math.pow(2, totalSemitones / 12.0)));

    const gain = this.ctx.createGain();
    const padVol = settings.volume ?? 1.0;
    gain.gain.value = Math.max(0.05, Math.min(1.5, velocity * padVol));

    source.connect(gain);
    gain.connect(this.workletNode);
    source.start();

    // Haptic pulse based on category
    const cat = padCfg?.category || 'kick';
    this.triggerHaptic(cat);
  }

  // --- CONTINUOUS LEGATO GLISSANDO & SLIDING ENGINE ---
  public startSustainedNote(pitchMidi: number, velocity: number = 0.85) {
    if (!this.ctx || !this.workletNode) return;

    if (this.sustainedVoice) {
      this.slideHeldNote(pitchMidi);
      return;
    }

    const now = this.ctx.currentTime;
    const targetFreq = 440 * Math.pow(2, (pitchMidi - 69) / 12);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const patch = this.synthSettings.patch;
    if (patch === '808_glide_sub') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);
      filter.Q.value = 1.2;
    } else if (patch === 'rhodes_suitcase') {
      osc1.type = 'sine';
      osc2.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.value = 2.0;
    } else if (patch === 'vintage_moog_bass') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      filter.Q.value = 5.0;
    } else {
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.synthSettings.filterCutoff, now);
      filter.Q.value = this.synthSettings.resonance;
    }

    osc1.frequency.setValueAtTime(targetFreq, now);
    osc2.frequency.setValueAtTime(targetFreq * 1.004, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.45, now + 0.02);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.workletNode);

    osc1.start(now);
    osc2.start(now);

    this.sustainedVoice = {
      osc1,
      osc2,
      filter,
      gain,
      currentPitch: pitchMidi
    };
  }

  public slideHeldNote(newPitchMidi: number) {
    if (!this.ctx || !this.sustainedVoice) {
      this.startSustainedNote(newPitchMidi);
      return;
    }

    const now = this.ctx.currentTime;
    const targetFreq = 440 * Math.pow(2, (newPitchMidi - 69) / 12);
    const glideSec = Math.max(0.02, this.synthSettings.glideTimeMs / 1000.0);

    const { osc1, osc2 } = this.sustainedVoice;
    try {
      osc1.frequency.cancelScheduledValues(now);
      osc2.frequency.cancelScheduledValues(now);
      osc1.frequency.setValueAtTime(osc1.frequency.value, now);
      osc2.frequency.setValueAtTime(osc2.frequency.value, now);
      osc1.frequency.exponentialRampToValueAtTime(targetFreq, now + glideSec);
      osc2.frequency.exponentialRampToValueAtTime(targetFreq * 1.004, now + glideSec);
    } catch {
      osc1.frequency.setValueAtTime(targetFreq, now);
      osc2.frequency.setValueAtTime(targetFreq * 1.004, now);
    }

    this.sustainedVoice.currentPitch = newPitchMidi;
  }

  public releaseSustainedNote() {
    if (!this.ctx || !this.sustainedVoice) return;
    const now = this.ctx.currentTime;
    const { osc1, osc2, gain } = this.sustainedVoice;

    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc1.stop(now + 0.09);
      osc2.stop(now + 0.09);
    } catch {
      // Ignored if stopped
    }

    this.sustainedVoice = null;
  }

  // --- POLYPHONIC SYNTHESIZER WITH CHORD MODE ---
  public playNote(pitchMidi: number, velocity: number = 0.85, durationSec: number = 0.6) {
    if (!this.ctx || !this.workletNode) return;

    if (this.synthSettings.chordMode) {
      const chordOffsets = {
        maj9: [0, 4, 7, 11, 14],
        min11: [0, 3, 7, 10, 14],
        trap_minor: [0, 3, 7, 12],
        neo_soul: [0, 7, 10, 15],
        power: [0, 7, 12]
      }[this.synthSettings.chordType] || [0, 3, 7];

      chordOffsets.forEach((offset, idx) => {
        setTimeout(() => {
          this.renderSingleSynthVoice(pitchMidi + offset, velocity * 0.7, durationSec);
        }, idx * 12);
      });
    } else {
      this.renderSingleSynthVoice(pitchMidi, velocity, durationSec);
    }
  }

  private renderSingleSynthVoice(pitchMidi: number, velocity: number, durationSec: number) {
    if (!this.ctx || !this.workletNode) return;

    const targetFreq = 440 * Math.pow(2, (pitchMidi - 69) / 12);
    const now = this.ctx.currentTime;
    const patch = this.synthSettings.patch;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    let startFreq = targetFreq;
    if (this.lastMidiPitch !== null && this.synthSettings.glideTimeMs > 0) {
      startFreq = 440 * Math.pow(2, (this.lastMidiPitch - 69) / 12);
    }
    this.lastMidiPitch = pitchMidi;

    const glideSec = this.synthSettings.glideTimeMs / 1000.0;

    if (patch === '808_glide_sub') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      filter.Q.value = 1.0;
    } else if (patch === 'rhodes_suitcase') {
      osc1.type = 'sine';
      osc2.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.value = 2.0;
    } else if (patch === 'vintage_moog_bass') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.value = 6.0;
    } else if (patch === 'hyperpop_saw_lead') {
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(6500, now);
      filter.Q.value = 4.0;
    } else {
      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.synthSettings.filterCutoff, now);
      filter.Q.value = this.synthSettings.resonance;
    }

    osc1.frequency.setValueAtTime(startFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(targetFreq, now + glideSec);
    osc2.frequency.setValueAtTime(startFreq * 1.004, now);
    osc2.frequency.exponentialRampToValueAtTime(targetFreq * 1.004, now + glideSec);

    const peakAmp = velocity * 0.4;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakAmp, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(peakAmp * 0.7, now + 0.12);
    gain.gain.setValueAtTime(peakAmp * 0.7, now + Math.max(0.12, durationSec - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.workletNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec + 0.05);
    osc2.stop(now + durationSec + 0.05);
  }

  // --- STEP SEQUENCER WITH MPC GROOVE & SWING ---
  public startSequencer() {
    if (this.isSequencerPlaying) return;
    this.isSequencerPlaying = true;
    this.scheduleNextStep();
  }

  public stopSequencer() {
    this.isSequencerPlaying = false;
    if (this.sequenceTimer !== null) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
  }

  private scheduleNextStep() {
    if (!this.isSequencerPlaying || !this.ctx) return;

    const bpm = this.grooveSettings.tempoBpm;
    const stepDurationMs = (60000 / bpm) / 4;

    const isOddStep = this.currentStep % 2 === 1;
    const swingFactor = (this.grooveSettings.swingPercent - 50) / 50;
    const swingDelayMs = isOddStep ? stepDurationMs * swingFactor * 0.66 : 0;
    const jitterMs = (Math.random() * 2 - 1) * this.grooveSettings.humanizeMs;

    for (let pad = 0; pad < 16; pad++) {
      if (this.drumPattern[pad]?.[this.currentStep]) {
        const velDrift = (Math.random() * 2 - 1) * (this.grooveSettings.velocityDrift / 100);
        const vel = Math.max(0.4, Math.min(1.0, 0.85 + velDrift));
        this.triggerPad(pad, vel);
      }
    }

    this.currentStep = (this.currentStep + 1) % 16;

    const nextInterval = Math.max(15, stepDurationMs + swingDelayMs + jitterMs);
    this.sequenceTimer = window.setTimeout(() => {
      this.scheduleNextStep();
    }, nextInterval);
  }

  // --- DEMO STEM GENERATION ---
  private generateDemoStems() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const duration = 4.0;
    const len = Math.floor(sr * duration);

    const vocBuf = this.ctx.createBuffer(2, len, sr);
    const vL = vocBuf.getChannelData(0);
    const vR = vocBuf.getChannelData(1);
    const notes = [220, 246.94, 261.63, 293.66, 329.63];

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.floor(t * 2) % notes.length;
      const f = notes[noteIdx];
      const voice = Math.sin(2 * Math.PI * f * t) * 0.5 +
                    Math.sin(2 * Math.PI * f * 2 * t) * 0.25 +
                    Math.sin(2 * Math.PI * 1200 * t) * 0.15;
      const trem = 1.0 + 0.1 * Math.sin(2 * Math.PI * 5 * t);
      const val = Math.tanh(voice * 1.5) * trem * 0.6;
      vL[i] = val;
      vR[i] = val;
    }
    this.vocalStemBuffer = vocBuf;

    const drumBuf = this.ctx.createBuffer(2, len, sr);
    const dL = drumBuf.getChannelData(0);
    const dR = drumBuf.getChannelData(1);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const beat = (t * 2.16) % 1.0;
      let s = 0;
      if (beat < 0.2) {
        s += Math.sin(2 * Math.PI * (120 * Math.exp(-beat * 25) + 50) * beat) * Math.exp(-beat * 14);
      }
      if (beat > 0.48 && beat < 0.75) {
        const dt = beat - 0.5;
        s += (Math.random() * 2 - 1) * Math.exp(-dt * 20) * 0.7;
      }
      const sixteenth = (t * 8.66) % 1.0;
      if (sixteenth < 0.08) {
        s += (Math.random() * 2 - 1) * Math.exp(-sixteenth * 50) * 0.25;
      }
      dL[i] = s * 0.7;
      dR[i] = s * 0.7;
    }
    this.drumStemBuffer = drumBuf;
  }

  public toggleStemLoop(stem: 'vocals' | 'drums') {
    if (!this.ctx || !this.workletNode) return;

    if (stem === 'vocals') {
      if (this.stemSources.vocals) {
        try { this.stemSources.vocals.stop(); } catch {}
        this.stemSources.vocals = undefined;
      } else if (this.vocalStemBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.vocalStemBuffer;
        src.loop = true;
        src.connect(this.workletNode);
        src.start();
        this.stemSources.vocals = src;
      }
    } else if (stem === 'drums') {
      if (this.stemSources.drums) {
        try { this.stemSources.drums.stop(); } catch {}
        this.stemSources.drums = undefined;
      } else if (this.drumStemBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.drumStemBuffer;
        src.loop = true;
        src.connect(this.workletNode);
        src.start();
        this.stemSources.drums = src;
      }
    }
  }

  public toggleStemPlayback() {
    if (this.isStemLooping) {
      if (this.stemSources.vocals) this.toggleStemLoop('vocals');
      if (this.stemSources.drums) this.toggleStemLoop('drums');
      this.isStemLooping = false;
    } else {
      if (!this.stemSources.vocals) this.toggleStemLoop('vocals');
      if (!this.stemSources.drums) this.toggleStemLoop('drums');
      this.isStemLooping = true;
    }
  }

  public isStemPlaying(stem: 'vocals' | 'drums'): boolean {
    return stem === 'vocals' ? !!this.stemSources.vocals : !!this.stemSources.drums;
  }

  // --- LOSSLESS OFFLINE STEM EXPORT ---
  public async renderLosslessExport(
    stemType: 'master' | 'vocals' | 'instrumental',
    durationSec: number = 8.0,
    bitDepth: 16 | 24 = 24
  ): Promise<{ blob: Blob; filename: string }> {
    const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const sampleRate = 48000;
    const length = Math.floor(sampleRate * durationSec);
    const offlineCtx = new OfflineCtxClass(2, length, sampleRate);

    const blob = new Blob([AURA_WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await offlineCtx.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    const offlineWorkletNode = new AudioWorkletNode(offlineCtx, 'aura-dsp-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });

    offlineWorkletNode.connect(offlineCtx.destination);

    // Apply current parameters to offline node
    const p = this.currentParams;
    offlineWorkletNode.port.postMessage({
      type: 'BATCH_PARAMS',
      params: {
        vocalPitchEnabled: p.vocalPitchEnabled ? 1 : 0,
        vocalTuneSpeed: p.vocalTuneSpeed / 100.0,
        compressorEnabled: p.compressorEnabled ? 1 : 0,
        reverbEnabled: p.reverbEnabled ? 1 : 0,
        masterGain: p.masterGain / 100.0
      }
    });

    // Render audio based on stem selection
    if (stemType === 'master' || stemType === 'vocals') {
      if (this.vocalStemBuffer) {
        const vocSrc = offlineCtx.createBufferSource();
        vocSrc.buffer = this.vocalStemBuffer;
        vocSrc.loop = true;
        vocSrc.connect(offlineWorkletNode);
        vocSrc.start(0);
      }
    }

    if (stemType === 'master' || stemType === 'instrumental') {
      if (this.drumStemBuffer) {
        const drumSrc = offlineCtx.createBufferSource();
        drumSrc.buffer = this.drumStemBuffer;
        drumSrc.loop = true;
        drumSrc.connect(offlineWorkletNode);
        drumSrc.start(0);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(renderedBuffer, bitDepth);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `AURA_DSP_${stemType.toUpperCase()}_${bitDepth}bit_${timestamp}.wav`;

    return { blob: wavBlob, filename };
  }

  private setupDefaultPattern() {
    this.drumPattern[1][0] = true;
    this.drumPattern[1][8] = true;
    this.drumPattern[5][4] = true;
    this.drumPattern[5][12] = true;
    for (let i = 0; i < 16; i += 2) {
      this.drumPattern[3][i] = true;
    }
    this.drumPattern[0][0] = true;
    this.drumPattern[0][6] = true;
    this.drumPattern[0][8] = true;
    this.drumPattern[9][2] = true;
    this.drumPattern[9][10] = true;
  }
}

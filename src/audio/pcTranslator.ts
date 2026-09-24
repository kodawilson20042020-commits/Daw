/**
 * AURA DSP - PC-to-Mobile Parameter Translation Engine
 * 
 * Maps desktop DAW project data (FL Studio .flp/.fst, Ableton Live .adg, VST plugin presets)
 * into lightweight, mobile-optimized DSP parameter structs.
 */

import { FxRackParameters, PcPresetTranslation, GrooveSettings } from '../types/audio';

export const BUILTIN_PC_PRESETS: PcPresetTranslation[] = [
  {
    id: 'metro_trap_808_voc',
    name: 'Metro Trap Master & 808 Chain',
    dawSource: 'FL Studio 21',
    description: 'FL Studio Maximus + Waves CLA-76 + Soundtoys Decapitator hybrid chain with hard punch and warm tape low-end.',
    desktopPlugins: ['Waves CLA-76 (Bluey)', 'Soundtoys Decapitator (Style T)', 'Fruity Parametric EQ 2', 'Antares Auto-Tune Pro (Hard Snap)'],
    parameters: {
      vocalPitchEnabled: true,
      vocalTuneSpeed: 95,
      vocalScale: 'c_harmonic_minor',
      vocalFormantShift: 0,
      vocalHumanizeVibrato: 10,
      vocalWetDry: 75,
      compressorEnabled: true,
      compLowGain: 4.5,
      compMidGain: 1.2,
      compHighGain: 2.5,
      tapeWarmthDrive: 68,
      compThreshold: -14,
      compCeilingLimiter: -0.2,
      compAutoGain: true,
      reverbEnabled: true,
      reverbRoomSize: 45,
      reverbDecayTime: 1.6,
      reverbDamping: 55,
      stereoWidth: 135,
      reverbWetDry: 22,
      masterGain: 98
    },
    groove: {
      tempoBpm: 140,
      swingPercent: 58,
      humanizeMs: 6,
      velocityDrift: 8
    }
  },
  {
    id: 'billie_spatial_intimate',
    name: 'Intimate Spatial Pop (Finneas Chain)',
    dawSource: 'Logic Pro',
    description: 'Pro-Q 3 high-shelf air + Valhalla VintageVerb 1970s concert hall with high stereo correlation and low-ratio optical compression.',
    desktopPlugins: ['FabFilter Pro-Q 3', 'Valhalla VintageVerb', 'Teletronix LA-2A', 'Celemony Melodyne 5'],
    parameters: {
      vocalPitchEnabled: true,
      vocalTuneSpeed: 35,
      vocalScale: 'a_minor',
      vocalFormantShift: -1.5,
      vocalHumanizeVibrato: 45,
      vocalWetDry: 85,
      compressorEnabled: true,
      compLowGain: -1.0,
      compMidGain: 0.5,
      compHighGain: 4.0,
      tapeWarmthDrive: 25,
      compThreshold: -18,
      compCeilingLimiter: -0.5,
      compAutoGain: true,
      reverbEnabled: true,
      reverbRoomSize: 85,
      reverbDecayTime: 3.4,
      reverbDamping: 30,
      stereoWidth: 165,
      reverbWetDry: 42,
      masterGain: 92
    },
    groove: {
      tempoBpm: 110,
      swingPercent: 52,
      humanizeMs: 14,
      velocityDrift: 15
    }
  },
  {
    id: 'travis_psychedelic_tape',
    name: 'Rodeo Psychedelic Tape Saturation',
    dawSource: 'Ableton Live 12',
    description: 'Heavy tape saturation, formant drop, and wide cavernous reverb replicating Travis Scott vocal and drum post-processing.',
    desktopPlugins: ['Ableton Saturator (Soft Sine)', 'Antares Auto-Tune (0 Speed)', 'Soundtoys EchoBoy', 'Lexicon 480L'],
    parameters: {
      vocalPitchEnabled: true,
      vocalTuneSpeed: 100,
      vocalScale: 'f_dorian',
      vocalFormantShift: -3.0,
      vocalHumanizeVibrato: 5,
      vocalWetDry: 90,
      compressorEnabled: true,
      compLowGain: 3.0,
      compMidGain: 2.0,
      compHighGain: 1.5,
      tapeWarmthDrive: 82,
      compThreshold: -10,
      compCeilingLimiter: -0.1,
      compAutoGain: true,
      reverbEnabled: true,
      reverbRoomSize: 90,
      reverbDecayTime: 4.2,
      reverbDamping: 40,
      stereoWidth: 150,
      reverbWetDry: 38,
      masterGain: 96
    },
    groove: {
      tempoBpm: 130,
      swingPercent: 62,
      humanizeMs: 9,
      velocityDrift: 12
    }
  },
  {
    id: 'drill_crisp_analog',
    name: 'UK/NY Drill Punch Master',
    dawSource: 'FL Studio 21',
    description: 'Pristine highs, sliding 808 transient crunch, and tight sidechain compression with zero phase distortion.',
    desktopPlugins: ['Fruity Soft Clipper', 'FabFilter Saturn 2', 'iZotope Ozone 11 Imager', 'Waves SSL G-Master'],
    parameters: {
      vocalPitchEnabled: true,
      vocalTuneSpeed: 80,
      vocalScale: 'c_minor' as any,
      vocalFormantShift: 0,
      vocalHumanizeVibrato: 15,
      vocalWetDry: 65,
      compressorEnabled: true,
      compLowGain: 5.5,
      compMidGain: -0.5,
      compHighGain: 3.5,
      tapeWarmthDrive: 74,
      compThreshold: -8,
      compCeilingLimiter: -0.1,
      compAutoGain: true,
      reverbEnabled: true,
      reverbRoomSize: 30,
      reverbDecayTime: 1.1,
      reverbDamping: 70,
      stereoWidth: 120,
      reverbWetDry: 16,
      masterGain: 100
    },
    groove: {
      tempoBpm: 144,
      swingPercent: 64,
      humanizeMs: 4,
      velocityDrift: 7
    }
  },
  {
    id: 'hyperpop_ott_glitch',
    name: 'Hyperpop & Glitchcore OTT Smasher',
    dawSource: 'Ableton Live 12',
    description: 'Xfer OTT upward expansion, crispy 20kHz Air EQ, Dimension D stereo widening, and ping-pong space delay for modern Charli XCX / 100 gecs vocals.',
    desktopPlugins: ['Xfer Records OTT', 'FabFilter Pro-DS', 'Roland SDD-320 Dimension D', 'Soundtoys EchoBoy'],
    parameters: {
      vocalPitchEnabled: true,
      vocalTuneSpeed: 100,
      vocalScale: 'c_major',
      vocalFormantShift: 2.5,
      vocalHumanizeVibrato: 0,
      vocalWetDry: 95,
      ottEnabled: true,
      ottDepth: 80,
      ottUpwardGain: 12.0,
      ottDownwardThreshold: -10,
      ottTimeScale: 80,
      deesserEnabled: true,
      deessThreshold: -18,
      deessFrequencyHz: 7200,
      deessAmount: 75,
      airBandGain: 6.5,
      chorusEnabled: true,
      chorusRateHz: 1.2,
      chorusDepth: 85,
      chorusDimensionMode: 3,
      chorusMix: 50,
      delayEnabled: true,
      delayTimeMs: 240,
      delayFeedback: 55,
      delayTapeWarmth: 35,
      delayPingPong: true,
      delayMix: 35,
      masterGain: 98
    },
    groove: {
      tempoBpm: 160,
      swingPercent: 50,
      humanizeMs: 2,
      velocityDrift: 5
    }
  },
  {
    id: 'king_tubby_dub_echo',
    name: 'King Tubby Space Echo Dub Master',
    dawSource: 'SP-404 MK2',
    description: 'Multi-head RE-201 saturated delay feedback spirals with 12-bit SP vinyl grit and warm tape compression.',
    desktopPlugins: ['Roland RE-201 Space Echo', 'Roland SP-404 MK2', 'Neve 1073 Preamp', 'Fairchild 670'],
    parameters: {
      delayEnabled: true,
      delayTimeMs: 375,
      delayFeedback: 75,
      delayTapeWarmth: 85,
      delayPingPong: true,
      delayMix: 60,
      lofiEnabled: true,
      lofiBitDepth: 12,
      lofiSampleRateReduce: 2,
      lofiVinylCrackle: 45,
      lofiWowFlutter: 35,
      lofiFilterFreq: 5200,
      chorusEnabled: true,
      chorusRateHz: 0.6,
      chorusDepth: 60,
      chorusDimensionMode: 2,
      chorusMix: 30,
      compressorEnabled: true,
      compLowGain: 3.5,
      compMidGain: 1.0,
      compHighGain: 1.0,
      tapeWarmthDrive: 70,
      masterGain: 95
    },
    groove: {
      tempoBpm: 72,
      swingPercent: 66,
      humanizeMs: 18,
      velocityDrift: 20
    }
  }
];

export interface TranslationMappingEntry {
  desktopPlugin: string;
  desktopParam: string;
  desktopRange: string;
  auraParam: keyof FxRackParameters;
  formula: string;
}

export const DESKTOP_MAPPING_MATRIX: TranslationMappingEntry[] = [
  {
    desktopPlugin: 'Antares Auto-Tune',
    desktopParam: 'Retune Speed',
    desktopRange: '0 - 400 ms',
    auraParam: 'vocalTuneSpeed',
    formula: 'auraSpeed = Math.round((1 - ms/400) * 100)'
  },
  {
    desktopPlugin: 'Antares Auto-Tune',
    desktopParam: 'Formant Throat Length',
    desktopRange: '0.8 - 1.2',
    auraParam: 'vocalFormantShift',
    formula: 'auraShift = (length - 1.0) * 60.0'
  },
  {
    desktopPlugin: 'Xfer Records OTT',
    desktopParam: 'Depth Amount',
    desktopRange: '0% - 100%',
    auraParam: 'ottDepth',
    formula: '1:1 direct percentage mapping'
  },
  {
    desktopPlugin: 'Xfer Records OTT',
    desktopParam: 'Upward Expansion Gain',
    desktopRange: '0 - 18 dB',
    auraParam: 'ottUpwardGain',
    formula: '1:1 direct decibel transfer'
  },
  {
    desktopPlugin: 'Roland Dimension D',
    desktopParam: 'Discrete Push Button Mode',
    desktopRange: 'Mode 1 - 4',
    auraParam: 'chorusDimensionMode',
    formula: 'Discrete integer state (1 to 4)'
  },
  {
    desktopPlugin: 'Soundtoys EchoBoy',
    desktopParam: 'Echo Time & Feedback',
    desktopRange: '10ms - 1000ms',
    auraParam: 'delayTimeMs',
    formula: '1:1 millisecond synchronization'
  },
  {
    desktopPlugin: 'FabFilter Pro-DS',
    desktopParam: 'Sibilance Threshold',
    desktopRange: '-40dB to 0dB',
    auraParam: 'deessThreshold',
    formula: '1:1 logarithmic threshold curve'
  },
  {
    desktopPlugin: 'Mäag Audio EQ4',
    desktopParam: '20kHz Air Band Gain',
    desktopRange: '0 to +12dB',
    auraParam: 'airBandGain',
    formula: '1:1 high-shelf shelf boost'
  },
  {
    desktopPlugin: 'Waves CLA-76',
    desktopParam: 'Input Gain / Ratio',
    desktopRange: 'All-Buttons / 4:1',
    auraParam: 'tapeWarmthDrive',
    formula: 'tapeDrive = Math.min(100, inputDb * 2.2)'
  },
  {
    desktopPlugin: 'FabFilter Saturn 2',
    desktopParam: 'Warm Tape Drive',
    desktopRange: '0 - 100%',
    auraParam: 'tapeWarmthDrive',
    formula: '1:1 direct float transfer'
  },
  {
    desktopPlugin: 'Valhalla VintageVerb',
    desktopParam: 'Decay Time',
    desktopRange: '0.2 - 20.0 s',
    auraParam: 'reverbDecayTime',
    formula: 'reverbDecay = Math.max(0.2, Math.min(8.0, seconds))'
  },
  {
    desktopPlugin: 'iZotope Ozone Imager',
    desktopParam: 'Stereo Width',
    desktopRange: '0% - 200%',
    auraParam: 'stereoWidth',
    formula: '1:1 direct percentage mapping'
  }
];

export function parseDesktopPresetJson(jsonStr: string): Partial<FxRackParameters> | null {
  try {
    const data = JSON.parse(jsonStr);
    const result: Partial<FxRackParameters> = {};
    if (typeof data.vocalTuneSpeed === 'number') result.vocalTuneSpeed = data.vocalTuneSpeed;
    if (typeof data.tapeWarmthDrive === 'number') result.tapeWarmthDrive = data.tapeWarmthDrive;
    if (typeof data.reverbDecayTime === 'number') result.reverbDecayTime = data.reverbDecayTime;
    if (typeof data.stereoWidth === 'number') result.stereoWidth = data.stereoWidth;
    if (typeof data.compLowGain === 'number') result.compLowGain = data.compLowGain;
    if (typeof data.compHighGain === 'number') result.compHighGain = data.compHighGain;
    return result;
  } catch {
    return null;
  }
}

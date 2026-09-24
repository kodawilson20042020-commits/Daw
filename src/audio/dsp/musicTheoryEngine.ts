/**
 * PRO AUDIO DSP LAB - MUSIC THEORY & MICROTONAL TUNING ENGINE
 *
 * Implements exact acoustic and musical mathematics:
 * - 12-TET Equal Temperament: f = 440 * 2^((n - 69)/12)
 * - Microtonal Equal Temperament: 24-TET (Quarter-Tone), 31-TET (Huygens), 53-TET (Mercator)
 * - Pure Just Intonation (harmonic integer ratios: 3:2, 5:4, 7:4, 9:8, 11:8, 13:8)
 * - Historical Tunings: Pythagorean (pure 3:2 fifths), Quarter-Comma Meantone (pure 5:4 thirds)
 * - Harmonic Series Generator: f_n = n * f_0 * sqrt(1 + B * n^2) [inharmonic string stiffness]
 * - Cents & Interval Calculation: cents = 1200 * log2(f / f_ref)
 */

export interface MusicalPitchInfo {
  frequencyHz: number;
  noteName: string;
  midiNumber: number;
  centsOffset: number;
  harmonicNumber?: number;
  ratioDescription?: string;
}

export type TuningSystemId =
  | '12-tet'
  | '24-tet'
  | '31-tet'
  | '53-tet'
  | 'just_intonation'
  | 'pythagorean'
  | 'meantone';

export interface TuningSystemDefinition {
  id: TuningSystemId;
  name: string;
  divisionsPerOctave: number;
  description: string;
  historicalEra: string;
  musicalUse: string;
  scaleSteps: { step: number; cents: number; ratioStr?: string; name: string }[];
}

export class MusicTheoryEngine {
  private static readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /**
   * Standard 12-TET conversion: MIDI Note Number (0-127) -> Frequency in Hz
   */
  public static midiToFrequency(midiNote: number, a4Hz: number = 440.0): number {
    return a4Hz * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Standard 12-TET conversion: Frequency in Hz -> Closest MIDI Note & Cents Deviation
   */
  public static frequencyToPitchInfo(freqHz: number, a4Hz: number = 440.0): MusicalPitchInfo {
    if (freqHz <= 0) {
      return {
        frequencyHz: 0,
        noteName: 'C-1',
        midiNumber: 0,
        centsOffset: 0
      };
    }

    const exactMidi = 69 + 12 * Math.log2(freqHz / a4Hz);
    const roundedMidi = Math.round(exactMidi);
    const centsOffset = Math.round((exactMidi - roundedMidi) * 100);

    const noteIndex = ((roundedMidi % 12) + 12) % 12;
    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteName = `${this.NOTE_NAMES[noteIndex]}${octave}`;

    return {
      frequencyHz: Math.round(freqHz * 100) / 100,
      noteName,
      midiNumber: roundedMidi,
      centsOffset
    };
  }

  /**
   * Calculate exact cents between two frequencies
   */
  public static centsBetween(f1: number, f2: number): number {
    if (f1 <= 0 || f2 <= 0) return 0;
    return Math.round(1200 * Math.log2(f2 / f1) * 10) / 10;
  }

  /**
   * Harmonic Series Generator with optional inharmonicity factor B:
   * f_n = n * f_0 * sqrt(1 + B * n^2)
   */
  public static generateHarmonics(
    fundamentalHz: number,
    numPartials: number = 16,
    inharmonicityB: number = 0.0
  ): { harmonicNumber: number; freqHz: number; ratioStr: string; centsOffset: number }[] {
    const list = [];
    for (let n = 1; n <= numPartials; n++) {
      const stiffnessFactor = Math.sqrt(1 + inharmonicityB * n * n);
      const freq = fundamentalHz * n * stiffnessFactor;
      const pitch = this.frequencyToPitchInfo(freq);
      list.push({
        harmonicNumber: n,
        freqHz: Math.round(freq * 10) / 10,
        ratioStr: `${n}:1`,
        centsOffset: pitch.centsOffset
      });
    }
    return list;
  }

  /**
   * Pure Just Intonation intervals based on prime limits (3, 5, 7)
   */
  public static readonly JUST_INTONATION_INTERVALS: { ratio: [number, number]; name: string; cents: number }[] = [
    { ratio: [1, 1], name: 'Root Unison', cents: 0.0 },
    { ratio: [16, 15], name: 'Diatonic Semitone', cents: 111.73 },
    { ratio: [9, 8], name: 'Major Second (Whole Tone)', cents: 203.91 },
    { ratio: [6, 5], name: 'Minor Third', cents: 315.64 },
    { ratio: [5, 4], name: 'Major Third (Pure 5-Limit)', cents: 386.31 },
    { ratio: [4, 3], name: 'Perfect Fourth', cents: 498.04 },
    { ratio: [7, 5], name: 'Subharmonic Tritone (7-Limit)', cents: 582.51 },
    { ratio: [3, 2], name: 'Perfect Fifth (Pure 3-Limit)', cents: 701.96 },
    { ratio: [8, 5], name: 'Minor Sixth', cents: 813.69 },
    { ratio: [5, 3], name: 'Major Sixth', cents: 884.36 },
    { ratio: [7, 4], name: 'Harmonic Seventh (Natural 7th)', cents: 968.83 },
    { ratio: [15, 8], name: 'Major Seventh', cents: 1088.27 },
    { ratio: [2, 1], name: 'Octave', cents: 1200.0 }
  ];

  /**
   * Microtonal & Historical Tuning System Library
   */
  public static readonly TUNING_SYSTEMS: TuningSystemDefinition[] = [
    {
      id: '12-tet',
      name: '12-TET (Standard Equal Temperament)',
      divisionsPerOctave: 12,
      description: 'Standard modern Western tuning dividing octave into 12 equal semitones of 100 cents.',
      historicalEra: '19th Century — Present',
      musicalUse: 'Universal modern pop, jazz, electronic, rock, and orchestral music.',
      scaleSteps: [
        { step: 0, cents: 0, name: 'Tonic' },
        { step: 1, cents: 100, name: 'Minor 2nd' },
        { step: 2, cents: 200, name: 'Major 2nd' },
        { step: 3, cents: 300, name: 'Minor 3rd' },
        { step: 4, cents: 400, name: 'Major 3rd' },
        { step: 5, cents: 500, name: 'Perfect 4th' },
        { step: 6, cents: 600, name: 'Tritone' },
        { step: 7, cents: 700, name: 'Perfect 5th' },
        { step: 8, cents: 800, name: 'Minor 6th' },
        { step: 9, cents: 900, name: 'Major 6th' },
        { step: 10, cents: 1000, name: 'Minor 7th' },
        { step: 11, cents: 1100, name: 'Major 7th' },
        { step: 12, cents: 1200, name: 'Octave' }
      ]
    },
    {
      id: 'just_intonation',
      name: '5-Limit Just Intonation',
      divisionsPerOctave: 12,
      description: 'Pure acoustic harmony based on integer ratios (3:2 fifths, 5:4 thirds) eliminating beatings.',
      historicalEra: 'Ancient Greece / Renaissance (Zarlino 1558)',
      musicalUse: 'Vocal ensembles, barbershop quartets, overtone singing, ambient acoustic resonances.',
      scaleSteps: MusicTheoryEngine.JUST_INTONATION_INTERVALS.map((item, idx) => ({
        step: idx,
        cents: item.cents,
        ratioStr: `${item.ratio[0]}:${item.ratio[1]}`,
        name: item.name
      }))
    },
    {
      id: '24-tet',
      name: '24-TET (Quarter-Tone System)',
      divisionsPerOctave: 24,
      description: 'Divides the octave into 24 steps of 50 cents, accommodating Arabic Maqam and spectralism.',
      historicalEra: 'Middle Eastern Maqam Traditions & 20th C. Avant-Garde',
      musicalUse: 'Arabic Rast & Bayati maqamat, Charles Ives, Alois Hába, modern microtonal electronic.',
      scaleSteps: Array.from({ length: 25 }, (_, i) => ({
        step: i,
        cents: i * 50,
        name: i % 2 === 0 ? `Semi ${i / 2}` : `Quarter ${i * 0.5}`
      }))
    },
    {
      id: '31-tet',
      name: '31-TET (Huygens Extended Meantone)',
      divisionsPerOctave: 31,
      description: 'Christiaan Huygens system (1691) achieving near-perfect 5:4 pure thirds and septimal intervals.',
      historicalEra: '17th Century Baroque (Christiaan Huygens)',
      musicalUse: 'Extreme harmonic sweetness, septimal harmony, microtonal polyphonic synthesizers.',
      scaleSteps: Array.from({ length: 32 }, (_, i) => ({
        step: i,
        cents: Math.round((i * (1200 / 31)) * 10) / 10,
        name: `Degree ${i}`
      }))
    },
    {
      id: '53-tet',
      name: '53-TET (Mercator / Turkish Holdrian System)',
      divisionsPerOctave: 53,
      description: 'High-precision division providing almost flawless Pythagorean fifths (0.07 cents error).',
      historicalEra: 'Ottoman Classical Music / Mercator 1676',
      musicalUse: 'Turkish Classical Makam, Persian Dastgah, ultimate microtonal pitch purity.',
      scaleSteps: Array.from({ length: 54 }, (_, i) => ({
        step: i,
        cents: Math.round((i * (1200 / 53)) * 10) / 10,
        name: `Koma ${i}`
      }))
    },
    {
      id: 'pythagorean',
      name: 'Pythagorean Tuning',
      divisionsPerOctave: 12,
      description: 'Generated strictly by stacking pure 3:2 fifths; brilliant fourths and fifths, sharp thirds.',
      historicalEra: 'Ancient Greece (c. 500 BC) to Medieval Europe',
      musicalUse: 'Gregorian chant, medieval organum, modal folk drone instruments.',
      scaleSteps: [
        { step: 0, cents: 0.0, ratioStr: '1:1', name: 'Root' },
        { step: 1, cents: 90.22, ratioStr: '256:243', name: 'Limma (Minor 2nd)' },
        { step: 2, cents: 203.91, ratioStr: '9:8', name: 'Epogdoon (Major 2nd)' },
        { step: 3, cents: 294.13, ratioStr: '32:27', name: 'Minor 3rd' },
        { step: 4, cents: 407.82, ratioStr: '81:64', name: 'Ditome (Major 3rd)' },
        { step: 5, cents: 498.04, ratioStr: '4:3', name: 'Diatessaron (4th)' },
        { step: 6, cents: 611.73, ratioStr: '729:512', name: 'Tritone' },
        { step: 7, cents: 701.96, ratioStr: '3:2', name: 'Diapente (5th)' },
        { step: 8, cents: 792.18, ratioStr: '128:81', name: 'Minor 6th' },
        { step: 9, cents: 905.87, ratioStr: '27:16', name: 'Major 6th' },
        { step: 10, cents: 996.09, ratioStr: '16:9', name: 'Minor 7th' },
        { step: 11, cents: 1109.78, ratioStr: '243:128', name: 'Major 7th' },
        { step: 12, cents: 1200.0, ratioStr: '2:1', name: 'Diapason (Octave)' }
      ]
    },
    {
      id: 'meantone',
      name: '1/4-Comma Meantone',
      divisionsPerOctave: 12,
      description: 'Flattens the fifths by 1/4 syntonic comma (3.42 cents) so that major thirds are pure 5:4.',
      historicalEra: 'Renaissance & Baroque (1500–1750)',
      musicalUse: 'Renaissance polyphony, Praetorius organs, Bach early keyboard treatises.',
      scaleSteps: [
        { step: 0, cents: 0.0, name: 'Root' },
        { step: 1, cents: 76.05, name: 'Minor 2nd' },
        { step: 2, cents: 193.16, name: 'Major 2nd' },
        { step: 3, cents: 310.26, name: 'Minor 3rd' },
        { step: 4, cents: 386.31, name: 'Pure Major 3rd (5:4)' },
        { step: 5, cents: 503.42, name: 'Perfect 4th' },
        { step: 6, cents: 579.47, name: 'Tritone' },
        { step: 7, cents: 696.58, name: 'Meantone 5th' },
        { step: 8, cents: 772.63, name: 'Minor 6th' },
        { step: 9, cents: 889.74, name: 'Major 6th' },
        { step: 10, cents: 1006.84, name: 'Minor 7th' },
        { step: 11, cents: 1082.89, name: 'Major 7th' },
        { step: 12, cents: 1200.0, name: 'Octave' }
      ]
    }
  ];

  /**
   * Get frequency for a given root note, tuning system, and scale step index
   */
  public static getTuningFrequency(
    systemId: TuningSystemId,
    stepIndex: number,
    octave: number = 4,
    rootFreqHz: number = 261.63 // Middle C (C4)
  ): number {
    const sys = this.TUNING_SYSTEMS.find((s) => s.id === systemId) || this.TUNING_SYSTEMS[0];
    const nSteps = sys.divisionsPerOctave;

    const octaveOffset = Math.floor(stepIndex / nSteps) + (octave - 4);
    const modStep = ((stepIndex % nSteps) + nSteps) % nSteps;

    const stepObj = sys.scaleSteps[modStep] || { cents: (modStep / nSteps) * 1200 };
    const totalCents = octaveOffset * 1200 + stepObj.cents;

    return rootFreqHz * Math.pow(2, totalCents / 1200);
  }
}

/**
 * AURA DSP - Monitoring & Reference Profiles Database
 * Factory profiles modeled after professional acoustic & playback environments:
 * SOURCE -> MIX -> MONITORING SYSTEM -> ACOUSTIC ENVIRONMENT -> LISTENER
 */

import { MonitoringProfile, CurvePoint, IirFilterBand } from '../types/audio';

const STORAGE_KEY = 'aura_dsp_monitoring_profiles_v1';

// Helper to generate parametric points
function createCurve(points: [number, number][]): CurvePoint[] {
  return points.map(([freq, gainDb]) => ({ freq, gainDb }));
}

export const FACTORY_PROFILES: MonitoringProfile[] = [
  // --- STUDIO PROFILES ---
  {
    id: 'studio_nearfield_5in',
    name: 'Nearfield 5" Active Studio Monitor',
    category: 'studio',
    description: 'Flat, critical midrange nearfield monitors (modeled after classic 5" acoustic response).',
    hardwareSimModel: '5-inch Kevlar Nearfield with acoustic front-porting',
    frequencyCurve: createCurve([
      [20, -18.0],
      [45, -6.0],
      [60, -1.5],
      [100, 0.0],
      [1000, 0.0],
      [3500, +1.2],
      [10000, +0.5],
      [18000, -2.0],
      [20000, -5.0]
    ]),
    crossoverFreq: 80,
    crossoverSlope: 24,
    bassRolloffFreq: 45,
    highRolloffFreq: 19000,
    distortionPercent: 0.2,
    compressionAmount: 0,
    stereoWidthFactor: 1.0,
    speakerAngle: 60,
    crossfeedEnabled: false,
    crossfeedAmount: 0,
    crossfeedFreq: 650,
    crossfeedDelayMs: 0.3,
    firTaps: 256,
    firPhaseMode: 'linear',
    latencyMs: 1.4,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 94,
    eqBands: [
      { id: '1', type: 'high_pass', frequency: 45, gainDb: 0, q: 0.707, enabled: true, solo: false },
      { id: '2', type: 'bell', frequency: 3200, gainDb: 1.2, q: 1.4, enabled: true, solo: false }
    ],
    isCustom: false,
    isCalibrated: true,
    dateModified: '2026-03-01'
  },
  {
    id: 'studio_midfield_8in',
    name: 'Midfield 8" 3-Way Reference',
    category: 'studio',
    description: 'Extended sub-bass depth down to 32Hz, ultra-linear transient response for mastering.',
    hardwareSimModel: '8-inch Tri-Amped Beryllium Studio Monitor',
    frequencyCurve: createCurve([
      [20, -6.0],
      [32, -1.0],
      [80, 0.0],
      [1000, 0.0],
      [10000, 0.0],
      [20000, -1.0]
    ]),
    crossoverFreq: 80,
    crossoverSlope: 24,
    bassRolloffFreq: 30,
    highRolloffFreq: 22000,
    distortionPercent: 0.1,
    compressionAmount: 0,
    stereoWidthFactor: 1.0,
    speakerAngle: 60,
    crossfeedEnabled: false,
    crossfeedAmount: 0,
    crossfeedFreq: 650,
    crossfeedDelayMs: 0.3,
    firTaps: 512,
    firPhaseMode: 'linear',
    latencyMs: 2.1,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 97,
    eqBands: [],
    isCustom: false,
    isCalibrated: true,
    dateModified: '2026-03-01'
  },

  // --- MOBILE & SMALL SPEAKERS ---
  {
    id: 'mobile_smartphone_speaker',
    name: 'Modern Smartphone Bottom Speaker',
    category: 'mobile',
    description: 'Acoustic micro-transducer simulation: steep bass cut < 240Hz, 3kHz vocal presence bump & port compression.',
    hardwareSimModel: '0.5W Micro-Speaker with boundary enclosure',
    frequencyCurve: createCurve([
      [20, -42.0],
      [100, -32.0],
      [220, -18.0],
      [300, -6.0],
      [500, +1.0],
      [1200, +2.5],
      [3200, +4.8], // Harsh vocal resonance
      [8000, +1.0],
      [14000, -8.0],
      [20000, -24.0]
    ]),
    crossoverFreq: 300,
    crossoverSlope: 48,
    bassRolloffFreq: 240,
    highRolloffFreq: 13500,
    distortionPercent: 4.8,
    compressionAmount: 45,
    stereoWidthFactor: 0.15, // Nearly mono collapse
    speakerAngle: 30,
    crossfeedEnabled: true,
    crossfeedAmount: 85,
    crossfeedFreq: 900,
    crossfeedDelayMs: 0.15,
    firTaps: 128,
    firPhaseMode: 'minimum',
    latencyMs: 0.8,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 89,
    eqBands: [
      { id: 'm1', type: 'high_pass', frequency: 240, gainDb: 0, q: 1.2, enabled: true, solo: false },
      { id: 'm2', type: 'bell', frequency: 3200, gainDb: 4.8, q: 2.0, enabled: true, solo: false },
      { id: 'm3', type: 'low_pass', frequency: 13500, gainDb: 0, q: 0.9, enabled: true, solo: false }
    ],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },
  {
    id: 'mobile_tablet_stereo',
    name: '11" Tablet Quad-Speaker Array',
    category: 'mobile',
    description: 'Wider stereo field than phone, bass down to 140Hz, crisp presence for dialog and streaming.',
    hardwareSimModel: 'Dual side-firing tablet stereo transducers',
    frequencyCurve: createCurve([
      [20, -36.0],
      [80, -22.0],
      [140, -6.0],
      [300, 0.0],
      [2500, +2.0],
      [7000, +1.5],
      [16000, -5.0]
    ]),
    crossoverFreq: 180,
    crossoverSlope: 24,
    bassRolloffFreq: 140,
    highRolloffFreq: 16000,
    distortionPercent: 2.1,
    compressionAmount: 25,
    stereoWidthFactor: 0.8,
    speakerAngle: 60,
    crossfeedEnabled: true,
    crossfeedAmount: 40,
    crossfeedFreq: 750,
    crossfeedDelayMs: 0.25,
    firTaps: 128,
    firPhaseMode: 'minimum',
    latencyMs: 0.9,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 91,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },

  // --- HEADPHONES ---
  {
    id: 'headphones_neutral_studio',
    name: 'Neutral Studio Reference Headphones',
    category: 'headphones',
    description: 'Harman target compensated curve for open-back mixing headphones with subtle Bauer crossfeed.',
    hardwareSimModel: 'Open-Back 300-Ohm Dynamic Driver',
    frequencyCurve: createCurve([
      [20, 0.0],
      [60, +1.0],
      [200, 0.0],
      [1000, 0.0],
      [3000, +3.5], // Pinna gain compensation
      [6000, -1.0],
      [10000, +1.0],
      [20000, 0.0]
    ]),
    crossoverFreq: 80,
    crossoverSlope: 24,
    bassRolloffFreq: 18,
    highRolloffFreq: 22000,
    distortionPercent: 0.08,
    compressionAmount: 0,
    stereoWidthFactor: 1.0,
    speakerAngle: 60,
    crossfeedEnabled: true,
    crossfeedAmount: 35,
    crossfeedFreq: 650,
    crossfeedDelayMs: 0.3,
    firTaps: 256,
    firPhaseMode: 'minimum',
    latencyMs: 1.2,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 98,
    eqBands: [],
    isCustom: false,
    isCalibrated: true,
    dateModified: '2026-03-01'
  },
  {
    id: 'headphones_consumer_bass',
    name: 'Consumer Wireless ANC Headphones',
    category: 'headphones',
    description: 'Mass-market V-shaped signature: +5.5dB boosted 50-90Hz sub, relaxed 2.5kHz mids, bright highs.',
    hardwareSimModel: 'Closed-Back 40mm Neodymium with active DSP EQ',
    frequencyCurve: createCurve([
      [20, +4.0],
      [55, +5.5],
      [120, +3.0],
      [400, 0.0],
      [1000, -1.5],
      [2500, -2.5],
      [8000, +4.0],
      [14000, +2.5]
    ]),
    crossoverFreq: 80,
    crossoverSlope: 24,
    bassRolloffFreq: 15,
    highRolloffFreq: 20000,
    distortionPercent: 0.4,
    compressionAmount: 15,
    stereoWidthFactor: 1.05,
    speakerAngle: 60,
    crossfeedEnabled: true,
    crossfeedAmount: 20,
    crossfeedFreq: 700,
    crossfeedDelayMs: 0.28,
    firTaps: 256,
    firPhaseMode: 'minimum',
    latencyMs: 1.2,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 92,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },

  // --- EARPHONES ---
  {
    id: 'earbuds_consumer_tws',
    name: 'Consumer TWS Wireless In-Ear Earbuds',
    category: 'earphones',
    description: 'In-ear silicone seal with moderate sub-bass seal resonance and 5kHz sibilance sensitivity.',
    hardwareSimModel: 'Balanced Armature + Dynamic Hybrid IEM',
    frequencyCurve: createCurve([
      [20, +2.0],
      [60, +3.5],
      [250, +1.0],
      [1000, 0.0],
      [3000, +4.0],
      [5500, +2.5],
      [9000, -3.0],
      [16000, -7.0]
    ]),
    crossoverFreq: 80,
    crossoverSlope: 24,
    bassRolloffFreq: 25,
    highRolloffFreq: 17500,
    distortionPercent: 0.6,
    compressionAmount: 10,
    stereoWidthFactor: 0.95,
    speakerAngle: 60,
    crossfeedEnabled: true,
    crossfeedAmount: 40,
    crossfeedFreq: 700,
    crossfeedDelayMs: 0.3,
    firTaps: 128,
    firPhaseMode: 'minimum',
    latencyMs: 0.9,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 90,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },

  // --- AUTOMOTIVE ---
  {
    id: 'car_standard_sedan',
    name: 'Standard Sedan Car Audio System',
    category: 'automotive',
    description: 'Vehicle cabin acoustics: resonant 120Hz mid-bass door cavity, windscreen glass reflections & road masking simulation.',
    hardwareSimModel: '4-Door Coaxial Array + Rear Deck 6x9 Woofers',
    frequencyCurve: createCurve([
      [20, -14.0],
      [45, -4.0],
      [110, +4.8], // Door cavity resonance
      [220, +2.0],
      [500, -2.0],
      [1000, 0.0],
      [3500, +3.0], // Windscreen reflection
      [7000, +1.5],
      [12000, -3.0],
      [18000, -10.0]
    ]),
    crossoverFreq: 90,
    crossoverSlope: 18,
    bassRolloffFreq: 40,
    highRolloffFreq: 15000,
    distortionPercent: 1.8,
    compressionAmount: 20,
    stereoWidthFactor: 0.85,
    speakerAngle: 90,
    crossfeedEnabled: true,
    crossfeedAmount: 60,
    crossfeedFreq: 550,
    crossfeedDelayMs: 0.45,
    firTaps: 256,
    firPhaseMode: 'minimum',
    latencyMs: 1.4,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 84,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },

  // --- HOME ---
  {
    id: 'home_bluetooth_cylinder',
    name: 'Portable Bluetooth Cylinder Speaker',
    category: 'home',
    description: 'Mono cylindrical portable speaker with dual passive radiators: tuned resonant bump at 75Hz, monophonic collapse.',
    hardwareSimModel: '2x 45mm Drivers with Opposed Passive Radiators',
    frequencyCurve: createCurve([
      [20, -36.0],
      [65, -8.0],
      [80, +3.5], // Passive radiator peak
      [150, +1.0],
      [1000, 0.0],
      [4000, +2.0],
      [12000, -4.0],
      [18000, -18.0]
    ]),
    crossoverFreq: 120,
    crossoverSlope: 24,
    bassRolloffFreq: 70,
    highRolloffFreq: 14000,
    distortionPercent: 3.2,
    compressionAmount: 35,
    stereoWidthFactor: 0.05, // Almost 100% mono
    speakerAngle: 30,
    crossfeedEnabled: true,
    crossfeedAmount: 95,
    crossfeedFreq: 600,
    crossfeedDelayMs: 0.2,
    firTaps: 128,
    firPhaseMode: 'minimum',
    latencyMs: 0.8,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 88,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },
  {
    id: 'home_tv_flat_panel',
    name: 'Slim Flat-Panel TV Rear Speakers',
    category: 'home',
    description: 'Downward/rear-firing slim drivers: no sub below 160Hz, boxy 400Hz-800Hz wall bounce, vocal intelligibility boost.',
    hardwareSimModel: 'Dual 10W Rear-Reflective Thin Transducers',
    frequencyCurve: createCurve([
      [20, -44.0],
      [100, -28.0],
      [160, -8.0],
      [400, +3.0], // Boxy wall bounce
      [800, +2.5],
      [2000, +2.0],
      [6000, 0.0],
      [12000, -6.0],
      [18000, -24.0]
    ]),
    crossoverFreq: 200,
    crossoverSlope: 24,
    bassRolloffFreq: 160,
    highRolloffFreq: 13000,
    distortionPercent: 3.8,
    compressionAmount: 40,
    stereoWidthFactor: 0.6,
    speakerAngle: 60,
    crossfeedEnabled: true,
    crossfeedAmount: 70,
    crossfeedFreq: 650,
    crossfeedDelayMs: 0.35,
    firTaps: 128,
    firPhaseMode: 'minimum',
    latencyMs: 0.9,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 86,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  },

  // --- LIVE & CLUB PA ---
  {
    id: 'live_club_pa_sub',
    name: 'Nightclub Sound System with Dual 18" Subs',
    category: 'live',
    description: 'Enormous 35-70Hz sub impact (+8dB), crossover dip at 90Hz, horn-loaded compression tweeter throw.',
    hardwareSimModel: 'Twin 18-inch Horn-Loaded Subwoofers + Line Coaxial Array',
    frequencyCurve: createCurve([
      [20, +2.0],
      [40, +8.5], // Sub rumble
      [65, +7.0],
      [95, -2.0], // Acoustic crossover dip
      [180, +1.0],
      [1000, 0.0],
      [2500, +2.5],
      [5000, +4.0], // Horn throw
      [10000, +1.0],
      [16000, -6.0]
    ]),
    crossoverFreq: 90,
    crossoverSlope: 36,
    bassRolloffFreq: 28,
    highRolloffFreq: 16000,
    distortionPercent: 2.4,
    compressionAmount: 30,
    stereoWidthFactor: 0.4, // Club sound is predominantly mono
    speakerAngle: 90,
    crossfeedEnabled: true,
    crossfeedAmount: 75,
    crossfeedFreq: 500,
    crossfeedDelayMs: 0.5,
    firTaps: 256,
    firPhaseMode: 'minimum',
    latencyMs: 1.5,
    safeCorrectionLimitDb: 6.0,
    roomConfidenceScore: 82,
    eqBands: [],
    isCustom: false,
    isCalibrated: false,
    dateModified: '2026-03-01'
  }
];

export class ProfileDatabase {
  public static getAllProfiles(): MonitoringProfile[] {
    if (typeof window === 'undefined') return FACTORY_PROFILES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(FACTORY_PROFILES));
        return FACTORY_PROFILES;
      }
      const parsed = JSON.parse(stored) as MonitoringProfile[];
      return parsed && parsed.length > 0 ? parsed : FACTORY_PROFILES;
    } catch {
      return FACTORY_PROFILES;
    }
  }

  public static saveProfile(profile: MonitoringProfile): MonitoringProfile[] {
    const profiles = this.getAllProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);
    if (existingIndex >= 0) {
      profiles[existingIndex] = { ...profile, dateModified: new Date().toISOString() };
    } else {
      profiles.push({ ...profile, dateModified: new Date().toISOString() });
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
    return profiles;
  }

  public static deleteProfile(profileId: string): MonitoringProfile[] {
    let profiles = this.getAllProfiles();
    profiles = profiles.filter((p) => p.id !== profileId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
    return profiles;
  }

  public static exportProfilesJson(): string {
    return JSON.stringify(this.getAllProfiles(), null, 2);
  }

  public static importProfilesJson(jsonStr: string): boolean {
    try {
      const imported = JSON.parse(jsonStr) as MonitoringProfile[];
      if (Array.isArray(imported) && imported.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        return true;
      }
    } catch (e) {
      console.error('Failed to import profiles:', e);
    }
    return false;
  }
}

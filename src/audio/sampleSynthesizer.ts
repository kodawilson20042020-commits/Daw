/**
 * AURA DSP - Built-in Studio-Grade Multi-Sample Synthesizer
 * Synthesizes physical, electronic, vintage boombap, and modern drill instruments in memory.
 * Zero network latency, zero external asset files.
 */

export interface SynthesizedSamples {
  [key: string]: AudioBuffer;
}

export function generateStudioSampleBank(ctx: BaseAudioContext): SynthesizedSamples {
  const bank: SynthesizedSamples = {};

  // 1. 808 Sub Bass (0.8s)
  bank['808_sub'] = renderBuffer(ctx, 0.8, (t) => {
    const pitch = 55 * Math.exp(-t * 3.5) + 38;
    const osc = Math.sin(2 * Math.PI * pitch * t);
    const saturated = Math.tanh(osc * 1.5);
    const env = Math.exp(-t * 3.2);
    return saturated * env * 0.9;
  });

  // 2. Punchy Kick (0.35s)
  bank['punchy_kick'] = renderBuffer(ctx, 0.35, (t) => {
    const pitch = 140 * Math.exp(-t * 28.0) + 48;
    const osc = Math.sin(2 * Math.PI * pitch * t);
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 180.0) * 0.6;
    const env = Math.exp(-t * 11.0);
    return (Math.tanh(osc * 1.8) * 0.85 + click) * env;
  });

  // 3. Acoustic Crack Snare (0.4s)
  bank['crack_snare'] = renderBuffer(ctx, 0.4, (t) => {
    const tone1 = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 22.0);
    const tone2 = Math.sin(2 * Math.PI * 330 * t) * Math.exp(-t * 26.0) * 0.5;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 14.0) * 0.85;
    return (tone1 + tone2 + noise) * 0.8;
  });

  // 4. Crisp Closed Hi-Hat (0.08s)
  bank['closed_hat'] = renderBuffer(ctx, 0.08, (t) => {
    const f = [380, 520, 710, 840, 1100, 1420];
    let metal = 0;
    for (let i = 0; i < f.length; i++) {
      metal += Math.sin(2 * Math.PI * f[i] * t);
    }
    const noise = (Math.random() * 2 - 1) * 0.5;
    const env = Math.exp(-t * 65.0);
    return (metal * 0.15 + noise * 0.8) * env * 0.75;
  });

  // 5. Sizzling Open Hi-Hat (0.5s)
  bank['open_hat'] = renderBuffer(ctx, 0.5, (t) => {
    const f = [380, 520, 710, 840, 1100, 1420];
    let metal = 0;
    for (let i = 0; i < f.length; i++) {
      metal += Math.sin(2 * Math.PI * f[i] * t);
    }
    const noise = (Math.random() * 2 - 1) * 0.6;
    const env = Math.exp(-t * 7.5);
    return (metal * 0.12 + noise * 0.7) * env * 0.7;
  });

  // 6. Studio Clap (0.35s)
  bank['studio_clap'] = renderBuffer(ctx, 0.35, (t) => {
    let clap = 0;
    const offsets = [0.0, 0.012, 0.024, 0.038];
    for (const off of offsets) {
      if (t >= off) {
        const dt = t - off;
        clap += (Math.random() * 2 - 1) * Math.exp(-dt * 55.0);
      }
    }
    const tail = (Math.random() * 2 - 1) * Math.exp(-t * 12.0) * 0.4;
    return (clap * 0.65 + tail) * 0.8;
  });

  // 7. Crisp Rimshot (0.12s)
  bank['rimshot'] = renderBuffer(ctx, 0.12, (t) => {
    const tone = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 40.0);
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 120.0);
    return (tone * 0.6 + click * 0.7) * 0.75;
  });

  // 8. 808 Cowbell (0.28s)
  bank['cowbell'] = renderBuffer(ctx, 0.28, (t) => {
    const osc1 = Math.sign(Math.sin(2 * Math.PI * 540 * t));
    const osc2 = Math.sign(Math.sin(2 * Math.PI * 800 * t));
    const env = Math.exp(-t * 14.0);
    return (osc1 * 0.4 + osc2 * 0.4) * env * 0.7;
  });

  // 9. Percussion Shaker (0.18s)
  bank['shaker'] = renderBuffer(ctx, 0.18, (t) => {
    const noise = (Math.random() * 2 - 1);
    const env = Math.sin(Math.min(Math.PI, t * 18)) * Math.exp(-t * 16.0);
    return noise * env * 0.65;
  });

  // 10. Vocal Breath Chop (0.45s)
  bank['vocal_chop'] = renderBuffer(ctx, 0.45, (t) => {
    const f0 = 220;
    const f1 = 750;
    const f2 = 1250;
    const f3 = 2500;
    const harm = Math.sin(2 * Math.PI * f0 * t) * 0.4 +
                 Math.sin(2 * Math.PI * f1 * t) * 0.35 +
                 Math.sin(2 * Math.PI * f2 * t) * 0.25 +
                 Math.sin(2 * Math.PI * f3 * t) * 0.15;
    const env = Math.sin(Math.min(Math.PI, t * 8.0)) * Math.exp(-t * 5.0);
    return Math.tanh(harm * 1.4) * env * 0.8;
  });

  // 11. Rhodes Electric Piano Chord (0.9s)
  bank['rhodes_chord'] = renderBuffer(ctx, 0.9, (t) => {
    const freqs = [261.63, 311.13, 392.00, 466.16, 587.33];
    let sum = 0;
    for (const f of freqs) {
      const tine = Math.sin(2 * Math.PI * f * t) +
                   Math.sin(2 * Math.PI * f * 3.98 * t) * Math.exp(-t * 18.0) * 0.25;
      sum += tine;
    }
    const trem = 1.0 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);
    const env = Math.exp(-t * 2.8);
    return (sum / freqs.length) * trem * env * 0.85;
  });

  // 12. Resonant Synth Pluck (0.5s)
  bank['synth_pluck'] = renderBuffer(ctx, 0.5, (t) => {
    const f0 = 440;
    let saw = 0;
    for (let h = 1; h <= 8; h++) {
      saw += (Math.sin(2 * Math.PI * f0 * h * t) / h) * Math.exp(-t * (4.0 + h * 3.0));
    }
    const env = Math.exp(-t * 7.0);
    return saw * env * 0.9;
  });

  // 13. OLD SCHOOL: MPC60 Boombap Kick (0.3s) - Warm low mid knock & 12-bit grit
  bank['mpc_boombap_kick'] = renderBuffer(ctx, 0.3, (t) => {
    const pitch = 95 * Math.exp(-t * 22.0) + 52;
    const osc = Math.sin(2 * Math.PI * pitch * t);
    const thump = Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 30.0) * 0.4;
    // 12-bit quantization simulation
    const raw = (osc * 0.8 + thump);
    const quantized = Math.round(raw * 2048) / 2048;
    return Math.tanh(quantized * 1.6) * Math.exp(-t * 9.5);
  });

  // 14. OLD SCHOOL: SP-1200 Dirty Snare (0.35s) - Ringing rim resonance & vinyl noise
  bank['sp1200_dirty_snare'] = renderBuffer(ctx, 0.35, (t) => {
    const ring = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 24.0) * 0.6;
    const crack = (Math.random() * 2 - 1) * Math.exp(-t * 16.0) * 0.75;
    const dirt = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 40.0) * 0.3;
    const mixed = ring + crack + dirt;
    return Math.tanh(mixed * 1.4) * 0.85;
  });

  // 15. NEW SCHOOL: Drill Sliding 808 (0.95s) - Heavy tube drive, aggressive upper harmonics
  bank['drill_sliding_808'] = renderBuffer(ctx, 0.95, (t) => {
    // Pitch glide simulation (starts at F#1 46Hz, glides to A1 55Hz)
    const glide = t < 0.2 ? 46 : (46 + (55 - 46) * Math.min(1.0, (t - 0.2) * 5.0));
    const fundamental = Math.sin(2 * Math.PI * glide * t);
    const secondHarm = Math.sin(2 * Math.PI * glide * 2 * t) * 0.5;
    const thirdHarm = Math.sin(2 * Math.PI * glide * 3 * t) * 0.25;
    const raw = fundamental + secondHarm + thirdHarm;
    // Hard-driving soft clipper
    const clipped = Math.tanh(raw * 2.2);
    const env = Math.exp(-t * 2.2);
    return clipped * env * 0.95;
  });

  // 16. NEW SCHOOL: Rage Hyper Bell (0.6s) - Digital chime with shimmer
  bank['rage_hyper_bell'] = renderBuffer(ctx, 0.6, (t) => {
    const f0 = 1320; // E6
    const chime1 = Math.sin(2 * Math.PI * f0 * t);
    const chime2 = Math.sin(2 * Math.PI * (f0 * 1.414) * t) * 0.6;
    const chime3 = Math.sin(2 * Math.PI * (f0 * 2.76) * t) * 0.3;
    const env = Math.exp(-t * 9.0);
    return (chime1 + chime2 + chime3) * env * 0.75;
  });

  // 17. 1970s SOUL BREAK & WAH (0.45s) - Dynamic funk break acoustic drum
  bank['70s_funk_break'] = renderBuffer(ctx, 0.45, (t) => {
    const kick = Math.sin(2 * Math.PI * (75 * Math.exp(-t * 24) + 42) * t) * Math.exp(-t * 12);
    const room = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.4;
    return (kick * 0.7 + room) * 0.9;
  });

  // 18. 1970s MOTOWN SNARE (0.35s) - Dead dampened tea-towel snare
  bank['70s_motown_snare'] = renderBuffer(ctx, 0.35, (t) => {
    const thud = Math.sin(2 * Math.PI * 165 * t) * Math.exp(-t * 30);
    const snap = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.65;
    return (thud * 0.75 + snap) * 0.85;
  });

  // 19. 1980s LINNDRUM CLAP (0.35s) - 80s Prince / Gated Reverb Clap
  bank['80s_linndrum_clap'] = renderBuffer(ctx, 0.35, (t) => {
    let bursts = 0;
    const offsets = [0, 0.015, 0.03, 0.045];
    for (const off of offsets) {
      if (t >= off) bursts += (Math.random() * 2 - 1) * Math.exp(-(t - off) * 60);
    }
    const gate = t < 0.22 ? 1.0 : Math.exp(-(t - 0.22) * 80);
    return bursts * gate * 0.85;
  });

  // 20. 1980s DX7 FM SOLID BASS (0.5s) - Punchy Yamaha DX7 Slap
  bank['80s_dx7_bass'] = renderBuffer(ctx, 0.5, (t) => {
    const f0 = 65.4; // C2
    const mod = Math.sin(2 * Math.PI * (f0 * 2) * t) * Math.exp(-t * 14) * 3.5;
    const carrier = Math.sin(2 * Math.PI * f0 * t + mod);
    return carrier * Math.exp(-t * 5.0) * 0.9;
  });

  // 21. 1990s JAZZ UPRIGHT BASS (0.6s) - Filtered NYC Hip-Hop upright pluck
  bank['90s_jazz_upright'] = renderBuffer(ctx, 0.6, (t) => {
    const f0 = 55.0; // A1
    const body = Math.sin(2 * Math.PI * f0 * t) + Math.sin(2 * Math.PI * f0 * 2 * t) * 0.35;
    const fingerNoise = (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.3;
    return (body + fingerNoise) * Math.exp(-t * 3.8) * 0.88;
  });

  // 22. 2000s NEPTUNES WOOD CLAVE (0.12s) - Ultra dry acoustic timber snap
  bank['2000s_wood_clave'] = renderBuffer(ctx, 0.12, (t) => {
    const wood1 = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 55);
    const wood2 = Math.sin(2 * Math.PI * 2750 * t) * Math.exp(-t * 65) * 0.6;
    return (wood1 + wood2) * 0.9;
  });

  // 23. 2010s ICONIC SPINZ 808 (1.2s) - Metro Boomin / Atlanta signature sub
  bank['spinz_808'] = renderBuffer(ctx, 1.2, (t) => {
    const pitch = 48.0; // G1
    const osc = Math.sin(2 * Math.PI * pitch * t);
    // Asymmetric warm clipping for tube harmonics
    const sat = Math.tanh(osc * 2.8) + 0.15 * Math.sin(2 * Math.PI * pitch * 3 * t);
    const env = Math.exp(-t * 1.8);
    return sat * env * 0.95;
  });

  // 24. 2020s UK/NY DRILL GLIDE 808 (1.0s) - Aggressive octave sliding sub
  bank['uk_drill_glide_sub'] = renderBuffer(ctx, 1.0, (t) => {
    const glide = t < 0.25 ? 43.65 : (43.65 + (87.3 - 43.65) * Math.min(1.0, (t - 0.25) * 6.0));
    const raw = Math.sin(2 * Math.PI * glide * t);
    const crunch = Math.tanh(raw * 3.5) * 0.75 + Math.sin(2 * Math.PI * glide * 2 * t) * 0.25;
    return crunch * Math.exp(-t * 2.0) * 0.95;
  });

  return bank;
}

export function reverseAudioBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const reversed = ctx.createBuffer(numChannels, length, buffer.sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = reversed.getChannelData(c);
    for (let i = 0; i < length; i++) {
      dst[i] = src[length - 1 - i];
    }
  }
  return reversed;
}

export function sliceAudioBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  startPercent: number,
  endPercent: number
): AudioBuffer {
  const numChannels = buffer.numberOfChannels;
  const totalLen = buffer.length;
  const startIdx = Math.max(0, Math.min(totalLen - 1, Math.floor((startPercent / 100) * totalLen)));
  const endIdx = Math.max(startIdx + 1, Math.min(totalLen, Math.floor((endPercent / 100) * totalLen)));
  const slicedLen = Math.max(1, endIdx - startIdx);

  const sliced = ctx.createBuffer(numChannels, slicedLen, buffer.sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = sliced.getChannelData(c);
    for (let i = 0; i < slicedLen; i++) {
      dst[i] = src[startIdx + i];
    }
  }
  return sliced;
}

function renderBuffer(
  ctx: BaseAudioContext,
  durationSec: number,
  genSample: (timeSec: number) => number
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(durationSec * sampleRate);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const s = genSample(t);
    left[i] = s;
    right[i] = s * (1.0 - (i % 2 === 0 ? 0.03 : -0.03));
  }

  return buffer;
}
